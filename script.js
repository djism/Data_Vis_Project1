// Load the dataset
d3.csv("adult_census_sampled1.csv").then(function(data) {
    // Convert numerical columns to numbers
    const numericalColumns = ["Age", "Fnlwgt", "Education-num", "Capital-gain", 
                            "Capital-loss", "Hours-per-week"];
    
    data.forEach(d => {
        numericalColumns.forEach(col => {
            d[col] = +d[col];
        });
    });

    const variables = Object.keys(data[0]);
    const svg = d3.select("svg");
    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const margin = { 
        top: 50, 
        right: 50, 
        bottom: 120, 
        left: 130 
    };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    let selectedVariable = variables[0];
    let isUpright = true;
    let chartType = "distribution"; // New variable to track chart type
    let xAxisVariable = variables[0]; // Track X-axis variable for scatterplot
    let yAxisVariable = variables[1]; // Track Y-axis variable for scatterplot
    let selectedAxis = "x"; // To track which axis is being modified

    const colorPalette = [
        "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD",
        "#D4A5A5", "#9ED2C6", "#FFD93D", "#6BCB77", "#4D96FF"
    ];

    // Add radio buttons for chart type
    const chartControls = d3.select("#controls")
        .append("div")
        .attr("class", "chart-type-controls");

    chartControls.append("label")
        .html("Distribution <input type='radio' name='chartType' value='distribution' checked>");
    
    chartControls.append("label")
        .html("Scatterplot <input type='radio' name='chartType' value='scatter'>");

    // Add axis selection for scatterplot
    const axisControls = d3.select("#controls")
        .append("div")
        .attr("class", "axis-controls")
        .style("display", "none");

    axisControls.append("label")
        .html("X-axis <input type='radio' name='axis' value='x' checked>");
    
    axisControls.append("label")
        .html("Y-axis <input type='radio' name='axis' value='y'>");

    // Display current variables selected for scatterplot
    const axisDisplay = d3.select("#controls")
        .append("div")
        .attr("class", "axis-display")
        .style("display", "none");
        
    const xAxisDisplay = axisDisplay.append("div")
        .attr("class", "axis-info")
        .html(`<strong>X-axis:</strong> <span id="x-var">${xAxisVariable}</span>`);
        
    const yAxisDisplay = axisDisplay.append("div")
        .attr("class", "axis-info")
        .html(`<strong>Y-axis:</strong> <span id="y-var">${yAxisVariable}</span>`);

    // Populate the dropdown
    const dropdown = d3.select("#dropdown")
        .selectAll("option")
        .data(variables)
        .enter()
        .append("option")
        .text(d => d);

    updateChart();

    // Event listeners
    d3.select("#dropdown").on("change", function() {
        const newVariable = this.value;
        
        if (chartType === "scatter") {
            if (selectedAxis === "x") {
                xAxisVariable = newVariable;
                d3.select("#x-var").text(xAxisVariable);
            } else {
                yAxisVariable = newVariable;
                d3.select("#y-var").text(yAxisVariable);
            }
        } else {
            selectedVariable = newVariable;
        }
        updateChart();
    });

    d3.select("#toggle").on("click", function() {
        isUpright = !isUpright;
        updateChart();
    });

    d3.selectAll('input[name="chartType"]').on("change", function() {
        chartType = this.value;
        axisControls.style("display", chartType === "scatter" ? "block" : "none");
        axisDisplay.style("display", chartType === "scatter" ? "block" : "none");
        updateChart();
    });
    
    // Update selected axis when radio buttons change
    d3.selectAll('input[name="axis"]').on("change", function() {
        selectedAxis = this.value;
        // Update dropdown to show current value for the selected axis
        d3.select("#dropdown").property("value", 
            selectedAxis === "x" ? xAxisVariable : yAxisVariable);
    });

    function updateChart() {
        svg.selectAll("*").remove();
        
        if (chartType === "scatter") {
            drawScatterplot();
        } else {
            const isCategorical = !numericalColumns.includes(selectedVariable);
            if (isCategorical) {
                drawBarChart(selectedVariable);
            } else {
                drawHistogram(selectedVariable);
            }
        }
    }

    function drawScatterplot() {
        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
        const isXAxisCategorical = !numericalColumns.includes(xAxisVariable);
        const isYAxisCategorical = !numericalColumns.includes(yAxisVariable);
    
        // Add visualization type selector for categorical-categorical plots
        // if (isXAxisCategorical && isYAxisCategorical) {
        //     const vizTypes = ["overplot", "scaled", "jittered"];
        //     const vizSelector = d3.select("#controls")
        //         .append("div")
        //         .attr("class", "viz-type-controls")
        //         .style("margin-top", "10px");
    
        //     vizSelector.append("label")
        //         .text("Visualization Type: ");
    
        //     const select = vizSelector.append("select")
        //         .attr("id", "viz-type")
        //         .on("change", function() {
        //             chart.selectAll("*").remove();
        //             drawCategoricalPlot(this.value);
        //         });
    
        //     select.selectAll("option")
        //         .data(vizTypes)
        //         .enter()
        //         .append("option")
        //         .text(d => d.charAt(0).toUpperCase() + d.slice(1))
        //         .attr("value", d => d);
    
        //     drawCategoricalPlot("overplot"); // Default visualization
        //     return;
        // }
    
        // Set up scales
        let xScale, yScale;
        
        if (isXAxisCategorical) {
            const categories = Array.from(new Set(data.map(d => d[xAxisVariable])));
            xScale = d3.scaleBand()
                .domain(categories)
                .range([0, chartWidth])
                .padding(0.1);
        } else {
            xScale = d3.scaleLinear()
                .domain(d3.extent(data, d => d[xAxisVariable]))
                .range([0, chartWidth]);
        }
    
        if (isYAxisCategorical) {
            const categories = Array.from(new Set(data.map(d => d[yAxisVariable])));
            yScale = d3.scaleBand()
                .domain(categories)
                .range([chartHeight, 0])
                .padding(0.1);
        } else {
            yScale = d3.scaleLinear()
                .domain(d3.extent(data, d => d[yAxisVariable]))
                .range([chartHeight, 0]);
        }
    
        function drawCategoricalPlot(vizType) {
            // Aggregate data for categorical-categorical plots
            const aggregatedData = d3.rollup(
                data,
                v => v.length,
                d => d[xAxisVariable],
                d => d[yAxisVariable]
            );
    
            // Convert to array format
            const plotData = [];
            aggregatedData.forEach((yVal, x) => {
                yVal.forEach((count, y) => {
                    plotData.push({ x, y, count });
                });
            });
    
            const maxCount = d3.max(plotData, d => d.count);
    
            switch (vizType) {
                case "overplot":
                    // Simple overplotting
                    chart.selectAll("circle")
                        .data(plotData)
                        .enter()
                        .append("circle")
                        .attr("cx", d => xScale(d.x) + xScale.bandwidth() / 2)
                        .attr("cy", d => yScale(d.y) + yScale.bandwidth() / 2)
                        .attr("r", 5)
                        .attr("fill", colorPalette[0])
                        .attr("opacity", 0.7);
                    break;
    
                case "scaled":
                    // Scaled disks
                    const radiusScale = d3.scaleSqrt()
                        .domain([1, maxCount])
                        .range([3, 20]);
    
                    chart.selectAll("circle")
                        .data(plotData)
                        .enter()
                        .append("circle")
                        .attr("cx", d => xScale(d.x) + xScale.bandwidth() / 2)
                        .attr("cy", d => yScale(d.y) + yScale.bandwidth() / 2)
                        .attr("r", d => radiusScale(d.count))
                        .attr("fill", colorPalette[0])
                        .attr("opacity", 0.7);
                    break;
    
                case "jittered":
                    // Jittered points
                    const jitterPoints = [];
                    plotData.forEach(d => {
                        for (let i = 0; i < d.count; i++) {
                            jitterPoints.push({
                                x: d.x,
                                y: d.y
                            });
                        }
                    });
    
                    const jitterAmount = Math.min(xScale.bandwidth(), yScale.bandwidth()) * 0.4;
    
                    chart.selectAll("circle")
                        .data(jitterPoints)
                        .enter()
                        .append("circle")
                        .attr("cx", d => xScale(d.x) + xScale.bandwidth() / 2 + (Math.random() - 0.5) * jitterAmount)
                        .attr("cy", d => yScale(d.y) + yScale.bandwidth() / 2 + (Math.random() - 0.5) * jitterAmount)
                        .attr("r", 3)
                        .attr("fill", colorPalette[0])
                        .attr("opacity", 0.5);
                    break;
            }
    
            // Add tooltips for all visualization types
            chart.selectAll("circle")
                .on("mouseover", function(event, d) {
                    const count = vizType === "jittered" ? 1 : d.count;
                    d3.select(this)
                        .attr("opacity", 1)
                        .attr("stroke", "#333")
                        .attr("stroke-width", 1);
    
                    chart.append("text")
                        .attr("class", "tooltip")
                        .attr("x", +d3.select(this).attr("cx"))
                        .attr("y", +d3.select(this).attr("cy") - 10)
                        .attr("text-anchor", "middle")
                        .text(`Count: ${count}`);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("opacity", vizType === "jittered" ? 0.5 : 0.7)
                        .attr("stroke", "none");
                    chart.selectAll(".tooltip").remove();
                });
        }
    
        // Handle mixed categorical-numerical case (strip plot)
        if (isXAxisCategorical || isYAxisCategorical) {
            const jitterWidth = Math.min(xScale.bandwidth ? xScale.bandwidth() : 20, 20);
            
            chart.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", d => {
                    const baseX = isXAxisCategorical ? 
                        xScale(d[xAxisVariable]) + xScale.bandwidth() / 2 : 
                        xScale(d[xAxisVariable]);
                    return isXAxisCategorical ? 
                        baseX + (Math.random() - 0.5) * jitterWidth : 
                        baseX;
                })
                .attr("cy", d => {
                    const baseY = isYAxisCategorical ? 
                        yScale(d[yAxisVariable]) + yScale.bandwidth() / 2 : 
                        yScale(d[yAxisVariable]);
                    return isYAxisCategorical ? 
                        baseY + (Math.random() - 0.5) * jitterWidth : 
                        baseY;
                })
                .attr("r", 3)
                .attr("fill", colorPalette[0])
                .attr("opacity", 0.6)
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .attr("r", 5)
                        .attr("opacity", 1);
                    
                    chart.append("text")
                        .attr("class", "tooltip")
                        .attr("x", +d3.select(this).attr("cx"))
                        .attr("y", +d3.select(this).attr("cy") - 10)
                        .attr("text-anchor", "middle")
                        .text(`${xAxisVariable}: ${d[xAxisVariable]}, ${yAxisVariable}: ${d[yAxisVariable]}`);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("r", 3)
                        .attr("opacity", 0.6);
                    chart.selectAll(".tooltip").remove();
                });
        } else {
            // Regular scatterplot for numerical-numerical
            chart.selectAll("circle")
                .data(data)
                .enter()
                .append("circle")
                .attr("cx", d => xScale(d[xAxisVariable]))
                .attr("cy", d => yScale(d[yAxisVariable]))
                .attr("r", 3)
                .attr("fill", colorPalette[0])
                .attr("opacity", 0.6)
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .attr("r", 5)
                        .attr("opacity", 1);
                    
                    chart.append("text")
                        .attr("class", "tooltip")
                        .attr("x", xScale(d[xAxisVariable]))
                        .attr("y", yScale(d[yAxisVariable]) - 10)
                        .attr("text-anchor", "middle")
                        .text(`${xAxisVariable}: ${d[xAxisVariable]}, ${yAxisVariable}: ${d[yAxisVariable]}`);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("r", 3)
                        .attr("opacity", 0.6);
                    chart.selectAll(".tooltip").remove();
                });
        }
    
        // Add axes
        if (isXAxisCategorical) {
            chart.append("g")
                .attr("transform", `translate(0, ${chartHeight})`)
                .call(d3.axisBottom(xScale))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");
        } else {
            chart.append("g")
                .attr("transform", `translate(0, ${chartHeight})`)
                .call(d3.axisBottom(xScale));
        }
    
        if (isYAxisCategorical) {
            chart.append("g")
                .call(d3.axisLeft(yScale));
        } else {
            chart.append("g")
                .call(d3.axisLeft(yScale));
        }
    
        // Add title and labels
        chart.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`${yAxisVariable} vs ${xAxisVariable}`);
    
        chart.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight + margin.bottom - 30)
            .attr("text-anchor", "middle")
            .text(xAxisVariable);
    
        chart.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -chartHeight / 2)
            .attr("text-anchor", "middle")
            .text(yAxisVariable);
    }

    function drawBarChart(variable) {
        const counts = d3.rollup(data, v => v.length, d => d[variable]);
        const categories = Array.from(counts.keys());
        const frequencies = Array.from(counts.values());
    
        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
        // Set scales based on orientation
        const primaryScale = isUpright
            ? d3.scaleBand()
                .domain(categories)
                .range([0, chartWidth])
                .padding(0.1)
            : d3.scaleBand()
                .domain(categories)
                .range([0, chartHeight])
                .padding(0.1);
    
        const secondaryScale = isUpright
            ? d3.scaleLinear()
                .domain([0, d3.max(frequencies)])
                .range([chartHeight, 0])
            : d3.scaleLinear()
                .domain([0, d3.max(frequencies)])
                .range([0, chartWidth]);
    
        // Draw bars with different colors
        chart.selectAll(".bar")
            .data(categories)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => isUpright ? primaryScale(d) : 0)
            .attr("y", d => isUpright ? secondaryScale(counts.get(d)) : primaryScale(d))
            .attr("width", d => isUpright ? primaryScale.bandwidth() : secondaryScale(counts.get(d)))
            .attr("height", d => isUpright 
                ? chartHeight - secondaryScale(counts.get(d))
                : primaryScale.bandwidth())
            .attr("fill", (d, i) => colorPalette[i % colorPalette.length]) // Assign different colors
            .attr("opacity", 0.8)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("opacity", 1)
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1);
                
                // Add tooltip
                chart.append("text")
                    .attr("class", "tooltip")
                    .attr("x", isUpright ? primaryScale(d) : secondaryScale(counts.get(d)))
                    .attr("y", isUpright ? secondaryScale(counts.get(d)) - 5 : primaryScale(d))
                    .attr("text-anchor", "middle")
                    .text(`${counts.get(d)}`);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("opacity", 0.8)
                    .attr("stroke", "none");
                chart.selectAll(".tooltip").remove();
            });
    
        // Add axes based on orientation
        if (isUpright) {
            // Bottom axis
            chart.append("g")
                .attr("transform", `translate(0, ${chartHeight})`)
                .call(d3.axisBottom(primaryScale))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end")
                .attr("dx", "-0.8em")
                .attr("dy", "0.15em");
    
            // Left axis
            chart.append("g")
                .call(d3.axisLeft(secondaryScale));
        } else {
            // Left axis with rotated text
            chart.append("g")
                .call(d3.axisLeft(primaryScale))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end")
                .attr("dx", "-0.8em")
                .attr("dy", "0.15em");
    
            // Bottom axis
            chart.append("g")
                .attr("transform", `translate(0, ${chartHeight})`)
                .call(d3.axisBottom(secondaryScale));
        }
    
        // Add title
        chart.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Distribution of ${variable}`);
    
        // Add axis labels based on orientation
        if (isUpright) {
            // Y-axis label
            chart.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 20)
                .attr("x", -chartHeight / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text("Frequency");
    
            // X-axis label
            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + margin.bottom - 30)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text(variable);
        } else {
            // X-axis label (frequency)
            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + margin.bottom - 30)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text("Frequency");
    
            // Y-axis label
            chart.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 20)
                .attr("x", -chartHeight / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text(variable);
        }
    }

    function drawHistogram(variable) {
        const values = data.map(d => d[variable]);
        const bins = d3.histogram()
            .domain(d3.extent(values))
            .thresholds(10)
            (values);
    
        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
        // Set scales based on orientation
        const primaryScale = isUpright
            ? d3.scaleLinear()
                .domain([bins[0].x0, bins[bins.length - 1].x1])
                .range([0, chartWidth])
            : d3.scaleLinear()
                .domain([bins[0].x0, bins[bins.length - 1].x1])
                .range([0, chartHeight]);
    
        const secondaryScale = isUpright
            ? d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length)])
                .range([chartHeight, 0])
            : d3.scaleLinear()
                .domain([0, d3.max(bins, d => d.length)])
                .range([0, chartWidth]);
    
        // Draw bars with different colors
        chart.selectAll(".bar")
            .data(bins)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => isUpright ? primaryScale(d.x0) : 0)
            .attr("y", d => isUpright 
                ? secondaryScale(d.length)
                : primaryScale(d.x0))
            .attr("width", d => isUpright 
                ? primaryScale(d.x1) - primaryScale(d.x0) - 1
                : secondaryScale(d.length))
            .attr("height", d => isUpright
                ? chartHeight - secondaryScale(d.length)
                : primaryScale(d.x1) - primaryScale(d.x0) - 1)
            .attr("fill", (d, i) => colorPalette[i % colorPalette.length]) // Assign different colors
            .attr("opacity", 0.8)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("opacity", 1)
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1);
                
                // Add tooltip
                chart.append("text")
                    .attr("class", "tooltip")
                    .attr("x", isUpright ? primaryScale(d.x0) + (primaryScale(d.x1) - primaryScale(d.x0))/2 : secondaryScale(d.length) + 10)
                    .attr("y", isUpright ? secondaryScale(d.length) - 5 : primaryScale(d.x0) + (primaryScale(d.x1) - primaryScale(d.x0))/2)
                    .attr("text-anchor", "middle")
                    .text(`${d.length}`);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("opacity", 0.8)
                    .attr("stroke", "none");
                chart.selectAll(".tooltip").remove();
            });
    
        // Add axes based on orientation
        if (isUpright) {
            chart.append("g")
                .attr("transform", `translate(0, ${chartHeight})`)
                .call(d3.axisBottom(primaryScale));
    
            chart.append("g")
                .call(d3.axisLeft(secondaryScale));
        } else {
            chart.append("g")
                .call(d3.axisLeft(primaryScale));
    
            chart.append("g")
                .attr("transform", `translate(0, ${chartHeight})`)
                .call(d3.axisBottom(secondaryScale));
        }
    
        // Add title
        chart.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(`Distribution of ${variable}`);
    
        // Add axis labels based on orientation
        if (isUpright) {
            // Y-axis label
            chart.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 20)
                .attr("x", -chartHeight / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text("Frequency");
    
            // X-axis label
            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + margin.bottom - 30)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text(variable);
        } else {
            // X-axis label (frequency)
            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + margin.bottom - 30)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text("Frequency");
    
            // Y-axis label
            chart.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", -margin.left + 20)
                .attr("x", -chartHeight / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .text(variable);
        }
    }
});