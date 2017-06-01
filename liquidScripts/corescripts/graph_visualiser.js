var width = 960,
    height = 500;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var graph = {
	nodes: [],
	links: []
}

var buildGraph = function() {
	buildNodes()
	buildEdges()
}

var buildNodes = function() {
	for(var i in data.devices) {
		var name = data.devices[i]
		
		var item = {
			nameRef: name,
			name: name.toString(),
			device: name.toString(),
			component: undefined,
			resource: undefined,
			group: 1
		}

		graph.nodes.push(item)
	}

	for(var i in data.components) {
		var name = data.components[i].device + '/' + data.components[i].componentRef
		
		var item = {
			nameRef: name,
			name: data.components[i].componentRef.toString(),
			device: data.components[i].device.toString(),
			component: data.components[i].componentRef.toString(),
			componentType: data.components[i].type.toString(),
			resource: undefined,
			group: 2
		}

		graph.nodes.push(item)
	}

	for(var i in data.resources) {
		var name = data.resources[i].device + '/' + data.resources[i].componentRef + '/' + data.resources[i].resources
		
		var item = {
			nameRef: name,
			name: data.resources[i].resource.toString(),
			device: data.resources[i].device.toString(),
			component: data.resources[i].componentRef.toString(),
			resource: data.resources[i].resources.toString(),
			group: 3
		}

		graph.nodes.push(item)
	}
}

var buildEdges = function() {
	for(var i in data.components) {
		var devicePos = returnNodePosition(data.components[i].device)
		var componentPos = returnNodePosition(data.components[i].device + '/' + data.components[i].componentRef)
		
		var item = {
			source: devicePos,
			target: componentPos,
			value: 20
		}

		graph.links.push(item)
	}
}

var returnNodePosition = function(name) {
	for(var i in graph.nodes) {
		if(graph.nodes[i].nameRef == name) {
			return parseInt(i)
		}
	}
}

var load = function() {
	buildGraph()

  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var node = svg.selectAll(".node")
      .data(graph.nodes)
    	.enter().append('g')
    	.attr("class", "node")
      .call(force.drag);

  var circle = node.append("circle")
      .attr("r", 5)
      .style("fill", function(d) { return color(d.group); })

  var label = node.append("text")
      .attr("dy", ".35em")
      .text(function(d) {
				var text = ""
				if(d.resource) {
					text += "Resource: " + d.name
				} else if (d.component) {
					text += "Component " + d.componentType + ": " + d.name
				} else if (d.device) {
					text += "Device: " + d.name
				}

      	return text;
      });

  var cell = node.append("path")
      .attr("class", "cell");

  force.on("tick", function() {
    link
    		.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node
    		.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

    circle
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

    label
    		.attr("x", function(d) { return d.x + 8; })
        .attr("y", function(d) { return d.y; });
  });
}