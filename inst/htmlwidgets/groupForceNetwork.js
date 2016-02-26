HTMLWidgets.widget({

  name: "groupForceNetwork",
  type: "output",
  initialize: function(el, width, height) {

    // define moveToFront function
    // move the mouseover node (including text) to the front of the canvas
    d3.selection.prototype.moveToFront = function() {
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };

    d3.select(el).append("svg")
      .attr("width", width)
      .attr("height", height);

    return d3.layout.force();
  },
  resize: function(el, width, height, force) {

    d3.select(el).select("svg")
      .attr("width", width)
      .attr("height", height);

    force.size([width, height]).resume();
  },
  renderValue: function(el, x, force) {
    // Compute the node radius using the 
    // javascript math expression specified    
    
    // define color:
    var highcolor = "#FFD700";
    var fixed_stroke_color = "#333";  
    var protein_stroke_color = "#FFF";
    var group_stroke_color = "#999";
    
    // get the width and height
    var width = el.offsetWidth;
    var height = el.offsetHeight;
    
    var dr = 4,      // default point radius
      off = 30,    // cluster hull offset
      expand = {}, // expanded clusters
      data, net, force, hullg, hull, linkg, link, nodeg, node;
     
    // alias options from .R
    var options = x.options;
    
    //console.log("test");
    //debugger;
    
    // convert links and nodes data frames to d3 friendly format
    var gl_links = HTMLWidgets.dataframeToD3(x.links);
    var gl_nodes = HTMLWidgets.dataframeToD3(x.nodes);
    
    // re-construct link for D3
    if (options.directional) {
      gl_links.forEach(function(d) {
        d.source = 
          gl_nodes[d.source] || (gl_nodes[d.source] = {name: d.source}); 
        d.target = 
          gl_nodes[d.target] || (gl_nodes[d.target] = {name: d.target}); 
      });
    }
    else{
      gl_links.forEach(function(d) {
        d.source = gl_nodes[d.source] ;
        d.target = gl_nodes[d.target] ;
      });
    }
        
    // initialize expand, if group == 0 (background or non-selected), 
    // do not expand
    gl_nodes.forEach(function(d) {
      d.group != 0 ? expand[d.group] = true:expand[d.group]=false;
      });
    
    var curve = d3.svg.line()
        .interpolate("cardinal-closed")
        .tension(.85);

    // links by index number
    var linkedByIndex = {};
    // set this up even if zoom = F
    var zoom = d3.behavior.zoom();
    var vis = d3.select(el).select("svg");
    vis.selectAll("*").remove();
    
    // create makers for directional links, 
    // Per-type markers, as they don't inherit styles.
    // inhibit -|, phospho -O, regulate ->, others, --
    if (options.directional) {
    vis.append("defs").selectAll("marker")
        .data(["regulate", "phospho", "inhibit"])
      .enter().append("marker")
        .attr("id", function(d) { return 'marker_'+ d; })
        .attr("viewBox", function(d) { return d=="inhibit"?'-1 -5 2 10' :
                                              d=="phospho"?"-6 -6 12 12":
                                              "0 -5 10 10" })        
        .attr("refX", function(d) {return d=="inhibit" ? 12.5 : 20})
        .attr("refY", -0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("path")
        .attr("d", function(d) {
          return d=="inhibit"? "M 0,0 m -1,-5 L 1,-5 L 1,5 L -1,5 Z" : 
                (d=="phospho"? 
                "M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0":
                "M0,-5L10,0L0,5")});        
    }
    vis.append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "white")
    .attr("stroke", "black");
    
    // add two g layers; the first will be zoom target if zoom = T
    // fine to have two g layers even if zoom = F
    vis = vis
        .append("g").attr("class","zoom-layer")
        .append("g");

    // add zooming if requested
    if (options.zoom) {
      zoom.on("zoom", redraw)
      function redraw() {
        d3.select(el).select(".zoom-layer").attr("transform",
          "translate(" + d3.event.translate + ")"+
          " scale(" + d3.event.scale + ")");
      }

      d3.select(el).select("svg")        
        .attr("pointer-events", "all")
        .call(zoom);

    } else {
      zoom.on("zoom", null);
    }
    
    // layout hull, link, and node g
    hullg = vis.append("g");
    linkg = vis.append("g");
    nodeg = vis.append("g");
        
    var nodefillcolor = eval(options.nColourScale);        
    var hullfillcolor = eval(options.hColourScale);
        
    function nodeSize(d) {
      if(options.nodesize){
        return eval(options.radiusCalculation);
      }else{
        return 6        
      }
    }
    // function noop() { return false; }
    
    function nodeid(n) {
      return n.size ? "_g_"+n.group : n.name;
    }
    
    function linkid(l) {
      var u = nodeid(l.source),
          v = nodeid(l.target);
      return u<v ? u+"|"+v : v+"|"+u;
    }
    
    function getGroup(n) { return n.group; }
    function getGroupName(n) { return n.groupname; }
    
    // constructs the network to visualize
    function network(data, prev, index, indexName, expand) {
      expand = expand || {};
      var gm = {},    // group map
          nm = {},    // node map
          lm = {},    // link map
          gn = {},    // previous group nodes
          gc = {},    // previous group centroids
          nodes = [], // output nodes
          links = []; // output links
    
      // process previous nodes for reuse or centroid calculation
      if (prev) {
        prev.nodes.forEach(function(n) {
          var i = index(n), o;
          if (n.size > 0) {
            gn[i] = n;
            n.size = 0;
          } else {
            o = gc[i] || (gc[i] = {x:0,y:0,count:0});
            o.x += n.x;
            o.y += n.y;
            o.count += 1;
          }
        });
      }
    
      // determine nodes (group)
      for (var k=0; k<data.nodes.length; ++k) {
        var n = data.nodes[k],
            i = index(n),
            grpname = indexName(n),
            l = gm[i] || (gm[i]=gn[i]) || (gm[i]={name:grpname,group:i, 
            size:0, nodes:[]});
            //i==0?'background':
            //options.keywords+i, 
            
    
        if (expand[i]) {
          // the node should be directly visible
          nm[n.name] = nodes.length;
          nodes.push(n);
          if (gn[i]) {
            // place new nodes at cluster location (plus jitter)
            n.x = gn[i].x + Math.random();
            n.y = gn[i].y + Math.random();
          }
        } else {
          // the node is part of a collapsed cluster
          if (l.size == 0) {
            // if new cluster, add to set and position at centroid of leaf nodes
            nm[i] = nodes.length;
            nodes.push(l);
            if (gc[i]) {
              l.x = gc[i].x / gc[i].count;
              l.y = gc[i].y / gc[i].count;
            }
          }
          l.nodes.push(n);
        }
      // always count group size as we also use it to tweak 
      // the force graph strengths/distances
        l.size += 1;
      n.group_data = l;
      }
    
      for (i in gm) { gm[i].link_count = 0; }
    
      // determine links
      for (k=0; k<data.links.length; ++k) {
        var e = data.links[k],
            u = index(e.source),
            v = index(e.target);
        if (u != v) {
          gm[u].link_count++;
          gm[v].link_count++;
        }
        u = expand[u] ? nm[e.source.name] : nm[u];
        v = expand[v] ? nm[e.target.name] : nm[v];
        var i = (u<v ? u+"|"+v : v+"|"+u),
            l = lm[i] || (lm[i] = {source:u, target:v, size:0, 
                                  value:e.value, type:e.type});
        l.size += 1;
      }
      for (i in lm) { links.push(lm[i]); }
    
      return {nodes: nodes, links: links};
    }
    
    function convexHulls(nodes, index, indexGroup, offset) {
      var hulls = {};
      var hulls_grpname = {};
    
      // create point sets
      for (var k=0; k<nodes.length; ++k) {
        var n = nodes[k];
        if (n.size) continue;
        var i = index(n), nn = indexGroup(n)
            l = hulls[i] || (hulls[i] = []),            
            ll = hulls_grpname[i] || (hulls_grpname[i] = nn);            
        l.push([n.x-offset, n.y-offset]);
        l.push([n.x-offset, n.y+offset]);
        l.push([n.x+offset, n.y-offset]);
        l.push([n.x+offset, n.y+offset]);
      }
    
      // create convex hulls
      var hullset = [];
      for (i in hulls) {
        hullset.push({group: i, grpname: hulls_grpname[i], path: d3.geom.hull(hulls[i])});
      }
      
      return hullset;
    }
    
    function drawCluster(d) {
      return curve(d.path); // 0.8
    }
    
    // undo and restore the opacity of highlighted neighboring nodes 
    // as default
    function restore() { 
        node.selectAll("circle").style("opacity", 
        function(d) { 
          return d.size? 0.5:options.opacity });                            
        node.selectAll("text").style("opacity", 
        function(d) {
          return d.size? 1: (d.high==1?1:(d.group==0?
                                        options.opacityNoHover:1))                                         
        });
        link.style("opacity", 1);            
    }
    // discover neighboring nodes
    function neighboring(a, b) {
      return linkedByIndex[a.index + "," + b.index];
    }
    // discover neighboring nodes
    function connectedNodes(d) {
        // Remember any changes done here must have an 'undo' in the restore() function.        
        if (!d.size){ // only change expanded nodes
          // Changes to all but the neighboring nodes
          node.selectAll("circle").style("opacity", 
          function (o) { 
            return d.index==o.index?1:(neighboring(d, o) | 
                                       neighboring(o, d) ? 1 : 0.1); });     
          node.selectAll("text").style("opacity", 
          function (o) { 
            return d.index==o.index?1:(neighboring(d, o) | 
                                       neighboring(o, d) ? 1 : 0.1); });     
          
          // Changes to all but neighboring links
          link.style("opacity", function (o) { 
            return d.index==o.source.index | 
                   d.index==o.target.index ? 1 : 0.1; });                  
        }

    }
    
    function mouseover(d) {
      // HSIN-TA: remove animation
      d3.select(this).moveToFront();
      d3.select(this).select("text")
        .style("font", options.clickTextSize + "px " + options.fontFamily)
        .style("opacity", 1) ;
      // HSIN-TA: send node information of mouseover node.
      //if(d.group != 0){
      Shiny.onInputChange("networkd3_node_name", d.name);            
      //}
      connectedNodes(d);
    }

    function mouseout(d) { 
      d3.select(this).select("text")
        .style("font", options.fontSize + "px " + options.fontFamily) 
        .style("opacity", function(d) {
          return d.size? 1: (d.group==0 ? options.opacityNoHover : 1) });
      restore();
        
    }
    
    // click to fix and change stroke color of the node
    function click(d) {
      //return eval(options.clickAction)            
      d.fixed = d.fixed ? false : true;  
      d3.select(this).select("circle").style("stroke", 
      function(o){ 
        return o.fixed ? fixed_stroke_color : 
                (o.size ? group_stroke_color: protein_stroke_color) });      
    }
    
    // init to draw nodes, links, and hull
    function init() {
      if (force) force.stop();
    
      net = network({nodes: gl_nodes, links: gl_links}, net, getGroup, 
                              getGroupName, expand);
      net.links.forEach(function (d) {
        linkedByIndex[d.source + "," + d.target] = 1;
      });
    
      force = d3.layout.force()
          .nodes(net.nodes)
          .links(net.links)
          .size([width, height])
          .linkDistance(function(l, i) {
          var n1 = l.source, n2 = l.target;
        // larger distance for bigger groups:
        // both between single nodes and _other_ groups 
        // (where size of own node group still counts),
        // and between two group nodes.
        //
        // reduce distance for groups with very few outer links,
        // again both in expanded and grouped form, 
        // i.e. between individual nodes of a group and
        // nodes of another group or other group node or 
        // between two group nodes.
        //
        return 60 +
          Math.min(20 * Math.min(
            (n1.size || (n1.group != n2.group ? n1.group_data.size : 0)),
            (n2.size || (n1.group != n2.group ? n2.group_data.size : 0))),
            -30 +30 * Math.min(
            (n1.link_count || (n1.group != n2.group ? 
                               n1.group_data.link_count : 0)),
            (n2.link_count || (n1.group != n2.group ? 
                               n2.group_data.link_count : 0))),
             100);
          //return 150;
        })
        .linkStrength(function(l, i) {
        return 1;
        })                
        .charge(options.charge)    
        .friction(0.5)
        .start();
      
     var drag = force.drag()
        .on("dragstart", dragstart)
      // allow force drag to work with pan/zoom drag
      function dragstart(d) {
        d3.event.sourceEvent.preventDefault();
        d3.event.sourceEvent.stopPropagation();
      }
    
      var tooltip = d3.select("body").append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);
      
      hullg.selectAll("path.hull").remove();
      hull = hullg.selectAll("path.hull")
          .data(convexHulls(net.nodes, getGroup, getGroupName, off))
        .enter().append("path")
          .attr("class", "hull")
          .attr("d", drawCluster)
          .style("fill", function(d) { return hullfillcolor(d.group); })
          .style("fill-opacity", 0.3)
          .on("dblclick", function(d) {
            expand[d.group] = false; init();//center_view();
          })
          .on("mouseover", function(d) {
            tooltip.transition().duration(200).style("opacity", .9);      
            tooltip.html(d.grpname)  
            .style("left", (d3.event.pageX) + "px")     
            .style("top", (d3.event.pageY - 28) + "px");    
          })                  
          .on("mouseout", function(d) {       
              tooltip.transition().duration(500).style("opacity", 0);   
          });
    
      
      if (options.directional){
        link = linkg.selectAll("path.link").data(net.links, linkid);
        link.exit().remove();
        link.enter().append("path")
            .attr("class", "link")
            .attr("marker-end", function(d) { 
              return "url(#marker_" + d.type + ")"; })
            .style("stroke", options.linkColour)
            .style("fill", "none")
            .style("stroke-width", "1px")
            .style("opacity", options.opacity)
            .on("mouseover", function(d) {
                  d3.select(this)
                    // HSIN-TA: send target and souce of mouseover link.
                  Shiny.onInputChange("networkd3_target_name", d.target.name); 
                  Shiny.onInputChange("networkd3_source_name", d.source.name);
            });            
      }
      else{
        link = linkg.selectAll("line.link").data(net.links, linkid);
        link.exit().remove();
        link.enter().append("line")
            .attr("class", "link")          
            .style("stroke", options.linkColour)
            .style("opacity", options.opacity)                   
            .style("stroke-width", function(d) { 
              return d.value <= 0.1 ? 
                      Math.min(d.size, 1) : 
                      Math.sqrt(d.value) })
            .on("mouseover", function(d) {
                  d3.select(this)
                    // HSIN-TA: send target and souce of mouseover link.
                  Shiny.onInputChange("networkd3_target_name", d.target.name);
                  Shiny.onInputChange("networkd3_source_name", d.source.name);
            });
      }
            
      node = nodeg.selectAll("g.node").data(net.nodes, nodeid);
      
      var appendG=node.enter().append("g")
      .attr("class", function(d) { return "node" + (d.size?"":" leaf"); })
      .attr("transform", function(d){return "translate("+d.x+ ","+ d.y + ")"})
      .style("fill", function(d) { 
        return d.size ? hullfillcolor(d.group) : 
            (d.high==1 ? 
              highcolor:(d.group > 0 ? 
                nodefillcolor(d.heat) :hullfillcolor(d.group)) )  })
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)      
      .on("click", click)
      .on("dblclick", function(d) {            
            expand[d.group] = !expand[d.group];
            init();//center_view();
          })
      .call(force.drag);
      
      appendG.append("circle")
      .attr("r", function(d) { 
        return d.size ? 
        Math.min(d.size, 20) + dr : Math.min(20, nodeSize(d)); })
      .style("opacity", function(d) { return d.size? 0.5:options.opacity })
      .style("stroke", function(d) { 
        return d.size ? group_stroke_color: protein_stroke_color })
      .style("stroke-dasharray", function(d) { return d.size ? "5,5": "5,0" })
      .style("stroke-width", "1.5px");
      
      appendG.append("text")
      .attr("class", "nodetext")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name })
      .style("fill", "#333")      
      .style("font", options.fontSize + "px " + options.fontFamily)
      .style("opacity", function(d) {
        return d.size? 1: (d.high==1?
          1:(d.group==0?options.opacityNoHover:1)) });
      
      node.exit().remove();
    
      force.on("tick", function() {
        if (!hull.empty()) {
          hull.data(convexHulls(net.nodes, getGroup, getGroupName, off))
              .attr("d", drawCluster);
        }
        
        if (options.directional){
          link.attr("d", linkArc);
        }
        else{
          link.attr("x1", function(d) { return d.source.x; })
              .attr("y1", function(d) { return d.source.y; })
              .attr("x2", function(d) { return d.target.x; })
              .attr("y2", function(d) { return d.target.y; });
        }
        
    
        node.attr("transform", function(d){return "translate("+d.x+ ","+ d.y + ")"});
      });
            
    }
    function linkArc(d) {
      var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy);
      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    }
    
    init();//center_view();
  
    vis.attr("opacity", 1e-6)
      .transition()
        .duration(1000)
        .attr("opacity", 1);  
  },
  });