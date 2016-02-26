HTMLWidgets.widget({

  name: "forceNetwork",

  type: "output",

  initialize: function(el, width, height) {

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

  // Compute the node radius  using the javascript math expression specified
    function nodeSize(d) {
            if(options.nodesize){
                    return eval(options.radiusCalculation);

            }else{
                    return 6}

    }
    

    // alias options
    var options = x.options;

    // convert links and nodes data frames to d3 friendly format
    var links = HTMLWidgets.dataframeToD3(x.links);
    var nodes = HTMLWidgets.dataframeToD3(x.nodes);

    // get the width and height
    var width = el.offsetWidth;
    var height = el.offsetHeight;
  
    var cold_color = '#DDD';
    var hot_color = 'rgb(255, 51, 51)';
    var coldv = options.cold;
    var hotv = options.hot;
    var color = eval(options.colourScale);    
    //d3.scale.linear()
              //.domain([coldv, hotv])
              //.range([cold_color, hot_color ])
              //.nice();
    
    // set this up even if zoom = F
    var zoom = d3.behavior.zoom();

    // create d3 force layout
    force
      .nodes(d3.values(nodes))
      .links(links)
      .size([width, height])
      .linkDistance(options.linkDistance)
      .charge(options.charge)
      .on("tick", tick)
      .start();

    // thanks http://plnkr.co/edit/cxLlvIlmo1Y6vJyPs6N9?p=preview
    //  http://stackoverflow.com/questions/22924253/adding-pan-zoom-to-d3js-force-directed
      var drag = force.drag()
        .on("dragstart", dragstart)
      // allow force drag to work with pan/zoom drag
      function dragstart(d) {
        d3.event.sourceEvent.preventDefault();
        d3.event.sourceEvent.stopPropagation();
      }

    // select the svg element and remove existing children
    var svg = d3.select(el).select("svg");
    svg.selectAll("*").remove();
    // add two g layers; the first will be zoom target if zoom = T
    //  fine to have two g layers even if zoom = F
    svg = svg
        .append("g").attr("class","zoom-layer")
        .append("g")

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

    // draw links
    var link = svg.selectAll(".link")
      .data(force.links())
      .enter().append("line")
      .attr("class", "link")
      .style("stroke", options.linkColour)
      .style("opacity", options.opacity)
      .style("stroke-width", eval("(" + options.linkWidth + ")"))
      .on("mouseover", function(d) {
          d3.select(this)
            //.style("opacity", 1);
            // HSIN-TA: send target and souce of mouseover link.
            Shiny.onInputChange("mytarget", d.target.name);      
            Shiny.onInputChange("mysource", d.source.name);      
      });
      //.on("mouseout", function(d) {
          //d3.select(this)
          //  .style("opacity", options.opacity);
      //});

    // draw nodes
    var node = svg.selectAll(".node")
      .data(force.nodes())
      .enter().append("g")
      .attr("class", "node")
      .style("fill", function(d) { return color(d.group); })
      .style("opacity", options.opacity)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .on("click", click)
      .call(force.drag);

    node.append("circle")
      .attr("r", function(d){return nodeSize(d);})
      .style("stroke", "#fff")
      .style("opacity", options.opacity)
      .style("stroke-width", "1.5px");

    node.append("svg:text")
      .attr("class", "nodetext")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name })
      .style("fill", "#333")
      .style("font", options.fontSize + "px " + options.fontFamily)
      .style("opacity", function(d) {return d.group==0.0 ? options.opacityNoHover : 1})
      .style("pointer-events", "none");

    // Add the option for a bounded box
    function nodeBoxX(d,width) {
        if(options.bounded){
            var dx = Math.max(nodeSize(d), Math.min(width - nodeSize(d), d.x));
            return dx;
        }else{
            return d.x}
    }
    function nodeBoxY(d, height) {
        if(options.bounded){
            var dy = Math.max(nodeSize(d), Math.min(height - nodeSize(d), d.y));
            return dy;
        }else{
            return d.y}
    }

    function tick() {
      link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

      node
        .attr("transform", function(d) {
          return "translate(" + nodeBoxX(d,width) + "," + nodeBoxY(d,height) + ")";
        });
    }

    function mouseover(d) {
      // HSIN-TA: remove animation
      //d3.select(this).select("circle").transition()
      //  .duration(750)
      //  .attr("r", function(d){return nodeSize(d)+5;});
      d3.select(this).select("text")
        //.transition()
        //.duration(750)
        //.attr("x", 13)
        //.style("stroke-width", ".5px")        
        .style("font", options.clickTextSize + "px " + options.fontFamily)
        .style("opacity", 1) 
      // HSIN-TA: send node information of mouseover node.
      Shiny.onInputChange("mydata", d.name);      
    }

    function mouseout(d) {
      //d3.select(this).select("circle").transition()
      //  .duration(750)
      //  .attr("r", function(d){return nodeSize(d)+2;});
      d3.select(this).select("text")
        //.transition()
        //.duration(1250)
        //.attr("x", 0)
        .style("font", options.fontSize + "px " + options.fontFamily) 
        .style("opacity", function(d) {return d.group==0.0 ? options.opacityNoHover : 1})
      //Shiny.onInputChange("mydata", "")
    }
    
    function click(d) {
      //return eval(options.clickAction)            
      d.fixed = d.fixed ? false : true;  
    }
    
    if(options.legend){
      var heatFormat = d3.format(".3r");
          var heatLegendHeight =  30;        
          var heatLegendWidth = 300;
          var heatLegend = svg.selectAll('.legend')
            .data([0])         
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(18, 500)');
      			//.style('width', heatLegendWidth + 'px');
      
      		var gradient = heatLegend.append('svg')
      			.attr('width', heatLegendWidth)
      			.attr('height', heatLegendHeight);
      
      		// Create a unique ID for the heat gradient
      		var gradientID = 'heat_gradient' + Date.now();
      		gradient.append('svg:defs')
      			.append('svg:linearGradient')
      			  .attr('x1', '0%')
      			  .attr('y1', '0%')
      			  .attr('x2', '100%')
      			  .attr('y2', '0%')
      			  .attr('id', gradientID)
      			  .call(function (gradient) {
      				gradient.append('svg:stop')
      				  .attr('offset', '0%')
      				  .attr('style', 'stop-color:' + cold_color + ';stop-opacity:1');
      				gradient.append('svg:stop')
      				  .attr('offset', '100%')
      				  .attr('style', 'stop-color:' + hot_color + ';stop-opacity:1');
      			  });
      
      		gradient.append('rect')
      			.attr('width', heatLegendWidth)
      			.attr('height', heatLegendHeight)
      			.style('fill', 'url(#' + gradientID + ')');  
      
      		var labels = heatLegend.append('div')
        		.style('clear', 'both');
      		var format = d3.format("g");
      
      		heatLegend.append('span')
      		  .style('float', 'left')
      		  .text(heatFormat(coldv));
      
      		heatLegend.append('span')
      		  .style('float', 'right')
      		  .text(heatFormat(hotv));
    }
  },
});
