#' Create a D3 JavaScript force directed network graph with new features. 
#'
#' groupForceNetwork is an extension of the forece directd network graph in 
#' networkD3 library. It includes several new functions: 
#' \itemize{
#'  \item{Capture JS events and send back to R interface.}
#'  \item{Highlight nodes and neighbors whne mouseover the node.}
#'  \item{Show the membership for sets of nodes with polygon.}
#'  \item{Collapsable/expandable function of subnetworks.}
#'  \item{Provide the option of displaying directionality and three effects on
#'   edges.}
##' }
#'
#' @param Links a data frame object with the links between the nodes. It should
#' include the \code{Source} and \code{Target} for each link. These should be
#' numbered starting from 0. An optional \code{linkValue} variable can be 
#' included to specify the width of each link. \code{linkType} variable can be
#' included to specify the type of each link, including three types of link 
#' types: regulate, inhibit, and phospho. If the variable \code{directional} is
#' True, different shapes will present at the end of target side. If the link 
#' type does not specify, it will present the undirected link without shape at 
#' the end of target side. 
#' @param Nodes a data frame containing the node id and properties of the nodes.
#' It should include the \code{nodeID} for each node. An optional 
#' \code{nodeGroup} variable can be included to specify the index of the 
#' membership for each node such that nodes with different group indices will 
#' be grouped into different convex in the visualization. An optional 
#' \code{nodeGroupName} variable can be included to specify the name of the 
#' membership variable such that users can mouseover convex to see the name of 
#' the group or see the name when the convex is collapsed. An optional 
#' \code{nodeValue} variable can be included to specify the value on the node. 
#' Given a corresponding node color scale (which can be specified in 
#' \code{nColourScale}), each node will disply different colors in terms of the
#' value on the node. An optional \code{highlightedGene} variable can be 
#' included to specify whether the node should be highlighted or not (1, 0).
#' @param Source character string naming the network source variable in the
#' \code{Links} data frame.
#' @param Target character string naming the network target variable in the
#' \code{Links} data frame.
#' @param linkValue character string naming the variable in the \code{Links} 
#' data frame for how wide the links are.
#' @param NodeID character string specifying the node IDs in the \code{Nodes}
#' data frame.
#' @param Nodesize character string specifying the a column in the \code{Nodes}
#' data frame with some value to vary the node radius's with. See also
#' \code{radiusCalculation}.
#' @param nodeGroup character string specifying the group of each node in the
#' \code{Nodes} data frame.
#' @param nodeGroupName character string specifying the group name of each node 
#' in the \code{Nodes} data frame.
#' @param nodeValue character string specifying the value of each node in the 
#' \code{Nodes} data frame.
#' @param highlightedGene character string specifying whether each node in the 
#' \code{Nodes} data frame should be highlighted in the visualization or not.
#' @param height numeric height for the network graph's frame area in pixels.
#' @param width numeric width for the network graph's frame area in pixels.
#' @param nColourScale character string specifying thecategorical colour scale 
#' for the nodes in terms of the value of each node (\code{nodeValue}). See 
#' \url{https://github.com/mbostock/d3/wiki/Ordinal-Scales}.
#' @param hColourScale character string specifying thecategorical colour scale 
#' for the groups of convex. See 
#' \url{https://github.com/mbostock/d3/wiki/Ordinal-Scales}.
#' @param fontSize numeric font size in pixels for the node text labels.
#' @param fontFamily font family for the node text labels.
#' \code{radiusCalculation = JS("Math.sqrt(d.nodesize)+6")}.
#' @param charge numeric value indicating either the strength of the node
#' repulsion (negative value) or attraction (positive value).
#' @param linkColour character string specifying the colour you want the link
#' lines to be. Multiple formats supported (e.g. hexadecimal).
#' @param opacity numeric value of the proportion opaque you would like the
#' graph elements to be.
#' @param zoom logical value to enable (\code{TRUE}) or disable (\code{FALSE})
#' zooming.
#' @param opacityNoHover numeric value of the opacity proportion for node labels
#' text when the mouse is not hovering over them.
#' @param directional logical value to enable the link presnets direction or 
#' not.
#' 
#' @return An interactive network graph for a Shiny app. Use 
#' \code{input$networkD3_node_name} in a Shiny app to capture the name of 
#' mouseover node. Use \code{input$networkD3_target_name} and 
#' \code{input$networkD3_source_name} in a Shiny app to capture the name of 
#' target and source node of mouseover edge. Use \code{groupForceNetworkOutput}
#' function in ui.R to show the output of groupForceNetwork and 
#' \code{renderGroupForceNetwork} function in server.R to render interactive
#' network with \code{groupForceNetwork} function.
#' 
#' @examples
#### Tabular data example.
#' # Load data
#' data(exampleEdges)
#' data(exampleNodes)
#' data(exampleHullColours)
#' data(exampleNodeColours)
#' 
#' # Create graph
#' groupForceNetwork(Links = exampleEdges, Nodes = exampleNodes,
#'              Source = "source", Target = "target", linkValue = "stroke", 
#'              nodeID = "name", zoom = TRUE, nodeValue = "heat")
#'
#' # Create a graph with different group
#' groupForceNetwork(Links = exampleEdges, Nodes = exampleNodes, 
#'              Source = "source", Target = "target", linkValue = "stroke", 
#'              nodeID = "name", nodeGroup = "group", nodeGroupName = "grpname", 
#'              zoom = TRUE, nodeValue="heat", 
#'              nColourScale = exampleNodeColours, 
#'              hColourScale = exampleHullColours)
#'              
#' # Create a graph with different group and directionality
#' groupForceNetwork(Links = exampleEdges, Nodes = exampleNodes, 
#'              Source = "source", Target = "target", linkValue = "stroke", 
#'              nodeID = "name", nodeGroup = "group", nodeGroupName = "grpname", 
#'              zoom = TRUE, nodeValue="heat", 
#'              nColourScale = exampleNodeColours, 
#'              hColourScale = exampleHullColours, directional=T)
#' @source
#' D3.js was created by Michael Bostock. See \url{http://d3js.org/} and, more
#' specifically for force directed networks
#' \url{https://github.com/mbostock/d3/wiki/Force-Layout}.
#'
#' @export
groupForceNetwork <- function(Links, 
                         Nodes,
                         Source,
                         Target,
                         linkType,
                         linkValue,
                         nodeID,
                         nodeSize, 
                         nodeGroup, 
                         nodeGroupName, 
                         nodeValue, 
                         height = NULL,
                         width = NULL,
                         nColourScale = JS("d3.scale.category20()"),
                         hColourScale = JS("d3.scale.category20()"),
                         fontSize = 7,
                         fontFamily = "serif",                         
                         radiusCalculation = JS(" Math.sqrt(d.nodesize)+6"),
                         charge = -1000,
                         linkColour = "#666",
                         opacity = 0.6,
                         zoom = FALSE,                         
                         opacityNoHover = 0,                         
                         highlightedGene,
                         directional = FALSE)
{                
        radiusCalculation <- as.character(radiusCalculation)

        # Subset data frames for network graph
        if (!is.data.frame(Links)) {
          stop("Links must be a data frame class object.")
        }
        if (!is.data.frame(Nodes)) {
          stop("Nodes must be a data frame class object.")
        }    
        
        
        # Check Link attributions
        if (missing(Source) | missing(Target)){
          stop("Links must contain at least source and target.")
        }
        
        if (!missing(linkValue) & !missing(linkType)){
          LinksDF <- data.frame(Links[, Source], Links[, Target], 
                                Links[, linkValue], Links[, linkType])
          names(LinksDF) <- c("source", "target", "value", "type")
        }
        else if (!missing(linkValue)){
          LinksDF <- data.frame(Links[, Source], Links[, Target], 
                                Links[, linkValue])
          # type of links will be treated as 'none' 
          # if no specific type on the link
          names(LinksDF) <- c("source", "target", "value")   
          LinksDF$type <- 'none'
        }
        else if (!missing(linkType)){
          LinksDF <- data.frame(Links[, Source], Links[, Target], 
                                Links[, linkType])
          names(LinksDF) <- c("source", "target", "type")
          LinksDF$type <- 1
        }
        
        # Check Node attributions
        if (missing(nodeID) ){
          stop("Nodes must contain at least nodeID .")
        }
        else{
          NodesDF <- data.frame(name = Nodes[, nodeID])
          
          if (!missing(nodeGroup)) 
            NodesDF$group <- Nodes[, nodeGroup] %>% unlist()
          else 
            NodesDF$group <- 1
          
          if (!missing(nodeGroupName)) 
            NodesDF$groupname <- Nodes[, nodeGroupName] %>% unlist()
          else 
            NodesDF$groupname <- ""
          
          if (!missing(nodeValue)) 
            NodesDF$heat <- Nodes[, nodeValue] %>% unlist()
          else 
            NodesDF$heat <- 1
          
          if (!missing(highlightedGene)) 
            NodesDF$high <- Nodes[, highlightedGene] %>% unlist()
          else 
            NodesDF$high <- 0          
          
          if (!missing(nodeSize)) {
            NodesDF$nodesize <- Nodes[, nodeSize] %>% unlist()
            nodesize <- T
          }
          else {
            NodesDF$nodesize <- 0
            nodesize <- F
          }
                    
          names(NodesDF) <- c("name",  "group", "groupname", 
                              "heat", "high", "nodesize")            

        }

        # create options
        options = list(
                nColourScale = nColourScale,
                hColourScale = hColourScale,                
                fontSize = fontSize,
                fontFamily = fontFamily,
                clickTextSize = fontSize * 2.5,
                charge = charge,
                linkColour = linkColour,
                opacity = opacity,
                zoom = zoom,   
                nodesize = nodesize,
                radiusCalculation = radiusCalculation,
                opacityNoHover = opacityNoHover,                
                directional = directional
        )

        # create widget
        htmlwidgets::createWidget(
                name = "groupForceNetwork",
                x = list(links = LinksDF, nodes = NodesDF, options = options),
                width = width,
                height = height,
                htmlwidgets::sizingPolicy(padding = 0, browser.fill = TRUE),
                package = "networkD3"
        )
}

#' @rdname networkD3-shiny
#' @export
groupForceNetworkOutput <- function(outputId, width = "100%", 
                                    height = "500px") {
        shinyWidgetOutput(outputId, "groupForceNetwork", width, height,
                          package = "networkD3")
}

#' @rdname networkD3-shiny
#' @export
renderGroupForceNetwork <- function(expr, env = parent.frame(), 
                                    quoted = FALSE) {
        if (!quoted) { expr <- substitute(expr) } # force quoted
        shinyRenderWidget(expr, groupForceNetworkOutput, env, quoted = TRUE)
}
