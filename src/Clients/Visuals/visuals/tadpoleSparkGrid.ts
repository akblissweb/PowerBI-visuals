/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 *
 *
 *  Angry Koala Tadpole Spark Grid Visualization 
 *  Visual Plugin for Microsoft Power BI Visualizations
 *  Author: Shaun Bliss, Angry Koala Pty Ltd. (blissweb@hotmail.com)   
 *  Creation Date: September 2015
 * 
 *  Shows a grid containing spark line charts based on a set of sequential periods data.
 *  It shows a red line in the line segment if the preceding point is
 *  higher than the following point. e.g. sales have declined.
 *  The last period has a thicker stroke as it would often by the 
 *  most important period to consider.
 *  There is a lessIsGood option for when you want to reverse the colors
 *  because sometimes less is good (eg. mistakes) but normally more is good (eg. profit)
 *
 */

/* Please make sure that this path is correct */
/// <reference path="../_references.ts"/>

module powerbi.visuals {

    export interface TadpoleSparkGridViewModel {
        periodData: any[];
        rowHeaders: any[];
        colHeaders: any[];
    };

    interface TadpoleSparkGridVisualStyle {
        chart: {
            width: number;
            height: number;
            bgColor: string;
            positiveColor: string;
            negativeColor: string;
            goodOpacity: number;
            badOpacity: number;
        };
        grid: {
            colWidth: number;
            rowHeight: number;
            colHeaderHeight: number;
            rowHeaderWidth: number;
        };
    }

    export class TadpoleSparkGrid implements IVisual {

        private static DefaultStyleProperties: TadpoleSparkGridVisualStyle = {
            chart: {
                width: 70,
                height: 18,
                bgColor: '#fefefe',
                positiveColor: '#222222', // this.style.colorPalette.dataColors.getSentimentColors()[2].value;
                negativeColor: '#FF0000', // this.style.colorPalette.dataColors.getSentimentColors()[0].value;
                goodOpacity: 0.9,
                badOpacity: 0.8
            },
            grid: {
                colWidth: 120,
                rowHeight: 50,
                colHeaderHeight: 40,
                rowHeaderWidth: 180
            }
        };

		/**
		  * Informs the System what it can do
		  * Fields, Formatting options, data reduction & QnA hints
		  */
        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: matrixRoleNames.rows,
                    kind: VisualDataRoleKind.Grouping
                },
                {
                    name: matrixRoleNames.values,
                    kind: VisualDataRoleKind.Measure
                }
            ],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },
                        lessIsGood: {
                            type: { bool: true },
                            displayName: 'Less is Good'
                        }
                    },
                }
            },
            dataViewMappings: [{
                conditions: [
                    { 'Rows': { min: 1 }, 'Columns': { max: 0 }, 'Values': { max: 0 } },
                    { 'Rows': { min: 0 }, 'Columns': { max: 0 }, 'Values': { max: 1 } },
                    { 'Rows': { min: 1 }, 'Columns': { max: 0 }, 'Values': { min: 1 } }
                ],
                matrix: {
                    rows: {
                        for: { in: 'Rows' },
                        /* Explicitly override the server data reduction to make it appropriate for matrix. */
                        dataReductionAlgorithm: { window: { count: 100 } }
                    },
                    columns: {
                        for: { in: 'Columns' },
                        /* Explicitly override the server data reduction to make it appropriate for matrix. */
                        dataReductionAlgorithm: { top: { count: 100 } }
                    },
                    values: {
                        for: { in: 'Values' }
                    }
                }
            }],
            filterMappings: {
                measureFilter: {
                    targetRoles: [matrixRoleNames.rows]
                }
            },
            sorting: {
                custom: {},
            },
            suppressDefaultTitle: true,
        };

        private viewModel: TadpoleSparkGridViewModel;
        private settings: TadpoleSparkGridVisualStyle;

        private svg: D3.Selection;
        private scrollingDiv: D3.Selection;
        private canvas: D3.Selection;

        private dataView: DataView;
        private options: VisualUpdateOptions;
        private style: IVisualStyle;
        private colors: IDataColorPalette;
        private lessIsGood: boolean;

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            if (options.objectName === 'general') {
                //var objects = this.getMatrixDataViewObjects();
                instances.push({
                    selector: null,
                    properties: {
                        lessIsGood: this.shouldSetLessIsGood(),
                    },
                    objectName: options.objectName
                });
            }
            return instances;
        }

        private shouldSetLessIsGood(): boolean {
            if (this.lessIsGood != null) {
                this.lessIsGood = !this.lessIsGood;
            } else {
                this.lessIsGood = false;
            }
            return this.lessIsGood;
        }

        // Convert a DataView into a view model
        public static converter(dataView: DataView): TadpoleSparkGridViewModel {
            var viewModel: TadpoleSparkGridViewModel = TadpoleSparkGrid.processMatrixModel(dataView);
            return viewModel;
        }

        public static processMatrixModel(dataView: DataView): TadpoleSparkGridViewModel {

            var viewModel: TadpoleSparkGridViewModel = {
                colHeaders: [],
                rowHeaders: [],
                periodData: []
            };

            var formatter: ICustomValueFormatter = valueFormatter.formatRaw;
            if (dataView.matrix != null) {
                var m: DataViewMatrix = dataView.matrix;
                if (m != null) { 
                    var matrixNavigator: IMatrixHierarchyNavigator = createMatrixHierarchyNavigator(m, formatter);
                    var rowNodes: MatrixVisualNode[];
                    var colNodes: MatrixVisualNode[];
                    if ((m.rows != null)&&(m.rows.root != null)) {
                        rowNodes = matrixNavigator.getChildren(m.rows.root);
                    }
                    if ((m.columns != null) && (m.columns.root != null)) {
                        colNodes = matrixNavigator.getChildren(m.columns.root);
                    }
                    var rowNodeDepth: number = matrixNavigator.getDepth(rowNodes);
                    if (rowNodeDepth > 1) {
                        var rowNo: number;
                        var arr: any[] = [];
                        var startDepth: number = 0;
                        var targetDepth: number = rowNodeDepth - 2;
                        var noRowNodes: number = rowNodes.length;
                        for (rowNo = 0; rowNo < noRowNodes; rowNo++) {
                            arr = TadpoleSparkGrid.addChildDetailsToArray(rowNodes[rowNo], arr, startDepth, targetDepth);
                        }
                        var colHeadersArr: any[] = TadpoleSparkGrid.buildColHeadersArr(colNodes);
                        var chartMeasuresArr: any[] = TadpoleSparkGrid.buildChartMeasuresArr(arr, colHeadersArr);
                        var rowHeadersArr: any[] = TadpoleSparkGrid.buildRowHeadersArr(arr);

                        viewModel.colHeaders = colHeadersArr;
                        viewModel.rowHeaders = rowHeadersArr;
                        viewModel.periodData = chartMeasuresArr;
                    }
                }
            }

            return viewModel;
        }

        public static buildColHeadersArr(arr: any[]): any[] {
            var colHeadersArr: any[] = [];
            var i: number;
            var len: number = arr.length;
            var curNode: MatrixVisualNode;
            for (i = 0; i < len; i++) {
                curNode = arr[i];
                colHeadersArr.push(curNode.name);
            }
            return colHeadersArr;
        }

        public static buildRowHeadersArr(arr: any[]): any[] {
            var rowHeadersArr: any[] = [];
            var rowNo: number;
            var len: number = arr.length;
            var curNode: MatrixVisualNode;
            var singleRowHeaderArr: any[] = [];
            //var parentNode: MatrixVisualNode;
            for (rowNo = 0; rowNo < len; rowNo++) {
                curNode = arr[rowNo];
                singleRowHeaderArr = [];
                while (curNode != null) {
                    singleRowHeaderArr.push(curNode.value);
                    curNode = curNode.parent;
                }
                rowHeadersArr.push(singleRowHeaderArr.reverse());
            }
            return rowHeadersArr;
        }

        public static buildChartMeasuresArr(arr: any[], colHeadersArr: any[]): any[] {
            var chartMeasuresArr = [];
            var measureNo: number;
            var rowNo: number;
            var len: number = arr.length;
            var curNode: MatrixVisualNode;
            var curChildNode: MatrixVisualNode;
            var chartData: any[];
            var chartPoint: any[];
            for (rowNo = 0; rowNo < len; rowNo++) {
                curNode = arr[rowNo];
                if (curNode.children != null) {
                    var noChartItems = curNode.children.length;
                    var chartItemIndex: number;
                    for (chartItemIndex = 0; chartItemIndex < noChartItems; chartItemIndex++) {
                        // do something
                        curChildNode = curNode.children[chartItemIndex];
                        if (curChildNode.values != null) {
                            chartData = [];
                            var measureNo = 0;
                            for (var prop in curChildNode.values) {
                                chartPoint = [curChildNode.value, colHeadersArr[measureNo], curChildNode.values[prop].value];
                                if (chartMeasuresArr[measureNo] == null) {
                                    chartMeasuresArr[measureNo] = [];
                                }
                                if (chartMeasuresArr[measureNo][rowNo] == null) {
                                    chartMeasuresArr[measureNo][rowNo] = [];
                                }
                                chartMeasuresArr[measureNo][rowNo][chartItemIndex] = chartPoint;
                                measureNo++;
                            }
                        }
                    }
                }
            }
            return chartMeasuresArr;
        }

        public static addChildDetailsToArray(node: MatrixVisualNode, arr: any[], curDepth: number, targetDepth: number): any[] {
            var noChildren = node.children.length;
            var childIndex;
            var curChildNode: MatrixVisualNode;
            if ((noChildren > 0) && (curDepth < targetDepth)) {
                for (childIndex = 0; childIndex < noChildren; childIndex++) {
                    // do something
                    curChildNode = node.children[childIndex];

                    /// check for no children here first
                    if ((curChildNode.children != null) &&
                        (curChildNode.children.length > 0)) {
                        arr = TadpoleSparkGrid.addChildDetailsToArray(curChildNode, arr, curDepth + 1, targetDepth);
                    }
                }
            } else {
                arr.push(node); // Canada level
            }
            return arr;
        }

        /* One time setup*/
        public init(options: VisualInitOptions): void {
            this.settings = TadpoleSparkGrid.DefaultStyleProperties;

            this.style = options.style;
            this.colors = this.style.colorPalette.dataColors;

            var height = options.viewport.height;
            var width = options.viewport.width;

            var div = this.scrollingDiv = d3.select(options.element.get(0)).append('div');
            this.resizeScrollingDiv(width, height);

            var svg = this.svg = div.append('svg');
            this.svg.attr('height', height).attr('width', width);
            this.canvas = svg.append('g');
        }

        /** Called for data, size, formatting changes **/
        public update(options: VisualUpdateOptions) {

            this.options = options;

            // remove canvas
            this.canvas.remove();
            this.canvas = this.svg.append('g');

            // convert the data views 
            var dataView = this.dataView = options.dataViews[0];
            var viewModel: TadpoleSparkGridViewModel = this.viewModel = TadpoleSparkGrid.converter(dataView);

            var height = options.viewport.height;
            var width = options.viewport.width;

            // make sure the canvas and the svg widths default to the screen size
            this.canvas.attr("width", width + 'px');
            this.canvas.attr("height", height + 'px');
            this.svg.attr("width", width + 'px');
            this.svg.attr("height", height + 'px');

            // draw the charts, which will increase the svg and canvas size if necessary and enable the div to scroll
            this.drawChartRows(this.canvas, viewModel.periodData, viewModel.rowHeaders, viewModel.colHeaders, width, height);

            // set the scrolling div to the viewport size, the svg and canvas size will match the graphics content
            this.resizeScrollingDiv(width, height);
        }

        /*About to remove your visual, do clean up here */
        public destroy() {
            this.canvas.remove();
            this.canvas = null;
            this.svg.remove();
            this.svg = null;
        }

        private resizeScrollingDiv(width, height) {
            this.scrollingDiv.style({
                "width": width + 'px',
                "height": height + 'px',
                "overflow-y": "auto",
                "overflow-x": "auto"
            });
        }

        private calcTotalRowHeaderWidth(rowHeaderWidths, rowHeaderColumnSpacing) {
            var noHeaders = rowHeaderWidths.length;
            var headerIndex;
            var totalRowHeaderWidth = 0;
            for (headerIndex = 0; headerIndex < noHeaders; headerIndex++) {
                totalRowHeaderWidth += rowHeaderWidths[headerIndex];
                if (headerIndex !== (noHeaders - 1)) {
                    totalRowHeaderWidth += rowHeaderColumnSpacing;
                }
            }
            return totalRowHeaderWidth;
        }

        private calcRowHeaderX(rowHeaderIndex, rowHeaderWidths, rowHeaderColumnSpacing) {
            var rowHeaderX = 0;
            var i;
            for (i = 0; i < rowHeaderIndex; i++) {
                rowHeaderX += rowHeaderWidths[i] + rowHeaderColumnSpacing;
            }
            return rowHeaderX;
        }

        private calcRowHeaderWidths(rowHeadings, textStyle: ITextStyle) {
            var rowNo;
            var len = rowHeadings.length;
            var noRowHeaders;
            var maxWidths = [];
            var curRow;
            var rowHeaderIndex;
            var curRowHeader;
            var curRowHeaderWidth;
            for (rowNo = 0; rowNo < len; rowNo++) {
                curRow = rowHeadings[rowNo];
                noRowHeaders = curRow.length;
                for (rowHeaderIndex = 0; rowHeaderIndex < noRowHeaders; rowHeaderIndex++) {
                    curRowHeader = rowHeadings[rowNo][rowHeaderIndex];
                    curRowHeaderWidth = this.estimateSvgTextWidth(textStyle, curRowHeader);
                    if ((maxWidths[rowHeaderIndex] == null) || (curRowHeaderWidth > maxWidths[rowHeaderIndex])) {
                        maxWidths[rowHeaderIndex] = curRowHeaderWidth;
                    }
                }
            }
            return maxWidths;
        }

        private convertStringFontSizeToNumber(fontSizeStr: string): number {
            var fontSize: number = Number(fontSizeStr.split("px")[0]);
            return fontSize;
        }

        private estimateSvgTextHeight(textStyle: ITextStyle, gridRowHeight) {
            var height = this.convertStringFontSizeToNumber(textStyle.fontSize) * 0.8;
            return height;
        }

        private estimateSvgTextWidth(textStyle: ITextStyle, text) {
            var len = text.length;
            var width = (this.convertStringFontSizeToNumber(textStyle.fontSize) * 0.5) * len;
            return width;
        }

        /** 
           Draw data rows with row label and tadpole spark charts using our custom d3 graphics routines.
        **/
        private drawChartRows(canvasSvg, data, rowHeadings, colHeadings, width, height) {

            // if we are missing any kind of data then abort
            if (!((data != null) && (data.length > 0) && (rowHeadings != null) && (rowHeadings.length > 0) &&
                ((colHeadings != null) && (colHeadings.length > 0)))) {
                return;
            }

            var chartHeight = this.settings.chart.height;
            var chartWidth = this.settings.chart.width;
            var chartBgColor = this.settings.chart.bgColor;
            var gridColWidth = this.settings.grid.colWidth;
            var gridRowHeight = this.settings.grid.rowHeight;
            var colHeaderHeight = this.settings.grid.colHeaderHeight;

            var textStyle: ITextStyle = this.style.labelText;
            textStyle.color = this.style.subTitleText.color;

            var rowHeaderWidth = this.settings.grid.rowHeaderWidth;

            // dynamic resizing 
            var rowHeaderColumnSpacing = height / 15;
            var maxRowHeight = 25;
            var minRowHeight = 16;
            gridRowHeight = height / 12;
            if (gridRowHeight > maxRowHeight) { gridRowHeight = maxRowHeight; }
            if (gridRowHeight < minRowHeight) { gridRowHeight = minRowHeight; }
            // var labelFontSize = gridRowHeight / 1.5;
            var verticalSpacing = gridRowHeight * 0.4;
            colHeaderHeight = gridRowHeight * 1.2;
            chartHeight = gridRowHeight * 0.85;
            chartWidth = chartHeight * 3;
            gridColWidth = chartWidth * 1.5;
            var noDataRows = data[0].length;
            var colHeaderElementIds = [];

            var rowHeaderWidths = this.calcRowHeaderWidths(rowHeadings, textStyle);
            var rowHeaderWidth = this.calcTotalRowHeaderWidth(rowHeaderWidths, rowHeaderColumnSpacing);
            var textHeight = this.estimateSvgTextHeight(textStyle, gridRowHeight);

            var yOffset = 5 + textHeight;
            var xOffset = 15;

            // draw column headers
            var noCols = colHeadings.length;
            var colHeaderY = yOffset;    /// (yOffset + colHeaderHeight) - ((colHeaderHeight - textHeight) / 2);
            var l;
            var id;
            for (l = 0; l < noCols; l++) {

                // calculate column x position
                var colHeaderX = xOffset + rowHeaderWidth + (l * (gridColWidth));

                // draw column headers
                id = "colHeader" + l;
                this.drawTextWithWrap(canvasSvg, colHeaderX, colHeaderY, colHeadings[l], textStyle, id, gridColWidth - 10);
                colHeaderElementIds.push(id);
            }

            // wrap the column header texts and vertically align them to the bottom returning the total height
            colHeaderHeight = this.verticallyPositionColHeaders(colHeaderElementIds);

            // calculated the size of all the graphics and text drawn and then size the svg and canvas to match
            var svgHeight = (noDataRows * (gridRowHeight + verticalSpacing)) + colHeaderHeight + yOffset;
            var svgWidth = xOffset + rowHeaderWidth + (noCols * gridColWidth);
            this.svg.attr("height", svgHeight + 'px');
            this.svg.attr("width", svgWidth + 'px');
            this.canvas.attr("height", svgHeight + 'px');
            this.canvas.attr("width", svgWidth + 'px');

            // set the row drawing start position to below the dynamically sized headers
            yOffset = yOffset + colHeaderHeight;

            // draw rows 
            var noRows = rowHeadings.length;
            var j;
            var k;
            var m;
            var chartX;
            var dataPoints;
            var rowHeaderX;
            var rowHeaderY;
            var chartY;;
            var noRowHeaderColumns = rowHeaderWidths.length;
            var rowHeaderText;
            var rect: D3.Selection;
            var dataObj: any[];
            for (j = 0; j < noRows; j++) {

                // draw row header
                for (m = 0; m < noRowHeaderColumns; m++) {
                    rowHeaderY = (yOffset + chartHeight) - ((chartHeight - textHeight) / 2);
                    rowHeaderX = this.calcRowHeaderX(m, rowHeaderWidths, rowHeaderColumnSpacing);
                    if ((j === 0) || (rowHeadings[j][m] !== rowHeadings[j - 1][m])) {
                        rowHeaderText = rowHeadings[j][m];
                    } else {
                        rowHeaderText = "";
                    }
                    if (rowHeaderText !== "") {
                        this.drawText(canvasSvg, rowHeaderX, rowHeaderY, rowHeadings[j][m], textStyle);
                    }
                }

                // flag indicating whether down or up is flagged as red
                // set in the controls
                var upGood: boolean = !this.lessIsGood;

                // draw each column of data
                for (k = 0; k < noCols; k++) {

                    // calculate column x position
                    // chartX = chartXOffset + (k * (gridColWidth));

                    // calculate column x position
                    chartX = xOffset + rowHeaderWidth + (k * (gridColWidth));
                    chartY = yOffset + ((gridRowHeight - chartHeight) / 2);

                    // draw data point chart and background
                    dataPoints = data[k][j];
                    rect = this.drawRectangle(canvasSvg, chartX, chartY, chartWidth, chartHeight, chartBgColor);
                    this.drawTadpoleSparkChart(canvasSvg, dataPoints, chartWidth, chartHeight, upGood, chartX, chartY);

                    // create data object including tool tip info
                    dataObj = this.createToolTipDataObj(dataPoints, j, k);
                    rect.data(dataObj);

                    TooltipManager.addTooltip(rect, (tooltipEvent: TooltipEvent) => tooltipEvent.data.toolTipInfo);

                }
                yOffset = yOffset + chartHeight + verticalSpacing;
            }
        }

        private createToolTipDataObj(dataPoints, row, col): any[] {
            var toolTipInfo: TooltipDataItem[] = [];
            // add row headers
            item = this.createToolTipDataItem(this.viewModel.rowHeaders[row], "");
            toolTipInfo.push(item);
            // add column header
            item = this.createToolTipDataItem("(" + this.viewModel.colHeaders[col] + ")", "");
            toolTipInfo.push(item);
            // add chart data points
            var len = dataPoints.length;
            var i;
            var item: TooltipDataItem;
            for (i = 0; i < len; i++) {
                // TODO - need to get the formatted value here somehow
                item = this.createToolTipDataItem(dataPoints[i][0], dataPoints[i][2]);
                toolTipInfo.push(item);
            }
            var dataObj = [{ toolTipInfo: toolTipInfo }];
            return dataObj;
        }

        private createToolTipDataItem(displayName, value): TooltipDataItem {
            var item: TooltipDataItem = {
                displayName: displayName,
                value: value
            };
            return item;
        }

        private verticallyPositionColHeaders(colHeaderElementIds) {
            var maxColHederHeight = this.calcMaxHeightOfElementsByIds(colHeaderElementIds);
            this.verticallyAlignElementsToBottom(colHeaderElementIds, maxColHederHeight);
            return maxColHederHeight;
        }

        private verticallyAlignElementsToBottom(elementIds, maxElementHeight) {
            var noElements = elementIds.length;
            var curElementId;
            var curElement;
            var curElementHeight;
            var yOffset;
            var curY;
            var newY;
            var j;
            for (j = 0; j < noElements; j++) {
                curElementId = elementIds[j];
                curElement = d3.select("text#" + curElementId);
                curElementHeight = this.getElementHeightById(curElementId);
                if (curElementHeight < maxElementHeight) {
                    yOffset = maxElementHeight - curElementHeight;
                    curY = curElement.attr("y");
                    newY = Number(curY) + yOffset;
                    curElement.attr("y", newY);
                    curElement.selectAll("*").attr("y", newY);
                }
            }
        }

        private calcMaxHeightOfElementsByIds(elements) {
            var noElements = elements.length;
            var curElement;
            var curElementHeight;
            var maxElementHeight = 0;
            var j;
            for (j = 0; j < noElements; j++) {
                curElement = elements[j];
                curElementHeight = this.getElementHeightById(curElement);
                if (curElementHeight > maxElementHeight) {
                    maxElementHeight = curElementHeight;
                }
            }
            return maxElementHeight;
        }

        private getElementHeightById(id) {
            // measure height
            var el = document.getElementById(id);
            var rect = el.getBoundingClientRect();
            var height = rect.height;
            return height;
        }

        private drawTadpoleSparkChart(canvasSvg: D3.Selection, yDataPoints: any[], width: number, height: number, upGood: boolean, xOffset: number, yOffset: number) {

            var yDataPointsValues:any[] = this.getValuesFromPoints(yDataPoints);
            var yDataPointsPercentages:any[] = this.calcDataPointPercentages(yDataPointsValues);
            var xAxisTickWidth: number = width / (yDataPoints.length - 1);
            var yScaleFactor: number = height / 100;
            var len: number = yDataPointsPercentages.length;
            var goodColor: string = this.settings.chart.positiveColor;
            var badColor: string = this.settings.chart.negativeColor;
            var defaultThickness: number = (width) / 70;
            var lastThickness: number = (width) / 18;
            var goodOpacity: number = this.settings.chart.goodOpacity;
            var badOpacity: number = this.settings.chart.badOpacity;
            var lastOpacity: number = 1;
            var thickness: number;
            var opacity: number;
            var color: string;
            var lastX: number = 0;
            var lastY: number = yDataPointsPercentages[0] * yScaleFactor;
            var nextX: number;
            var nextY: number;
            var i: number;
            var good: boolean = upGood;
            for (i = 1; i < len; i++) {
                nextX = lastX + xAxisTickWidth;
                nextY = yDataPointsPercentages[i] * yScaleFactor;
                if (Boolean(upGood)) {
                    good = Boolean(nextY > lastY);
                } else {
                    good = Boolean(nextY < lastY);
                }
                if (Boolean(good)) {
                    color = goodColor;
                    opacity = goodOpacity;
                } else {
                    color = badColor;
                    opacity = badOpacity;
                }
                if (i < len - 1) {
                    thickness = defaultThickness;
                } else {
                    thickness = lastThickness;
                    opacity = lastOpacity;
                }

                this.drawLine(canvasSvg, lastX, lastY,
                    nextX, nextY,
                    color, thickness, opacity, height, xOffset, yOffset);

                lastX = nextX;
                lastY = nextY;
            }
        }

        private getValuesFromPoints(points) {
            var values = new Array();
            var len = points.length;
            var i;
            var value;
            for (i = 0; i < len; i++) {
                value = this.getValueFromPoint(points[i]);
                values.push(value);
            }
            return values;
        }

        private getValueFromPoint(point) {
            // for now its the 3rd element in the array
            // change to objects later
            return point[2];
        }
        
        /** 
            Draw a d3 line starting from bottom left corner co-ordinate.
            Based on the height parameter.
         **/
        private drawLine(canvasSvg, x1, y1, x2, y2, color, strokeWidth, strokeAlpha, height, xOffset, yOffset) {

            // reverse y axis
            y1 = height - y1;
            y2 = height - y2;

            // create and draw line
            var lineSelection = canvasSvg.append("line")
                .attr("x1", x1 + xOffset)
                .attr("y1", y1 + yOffset)
                .attr("x2", x2 + xOffset)
                .attr("y2", y2 + yOffset)
                .attr("stroke", color)
                .attr("stroke-width", strokeWidth)
                .attr("stroke-opacity", strokeAlpha);

            return lineSelection;
        }

        /** 
            Draw a d3 rectangle starting from top left corner co-ordinate 
        **/
        private drawRectangle(canvasSvg: D3.Selection, x: number, y: number,
                              width: number, height: number, color: string): D3.Selection {
            var rectangle: D3.Selection = canvasSvg.append("rect")
                .attr("x", x)
                .attr("y", y)
                .attr("width", width)
                .attr("height", height)
                .attr("fill", color);
            return rectangle;
        }

        /** 
            Convert a one dimensional array of values into percentages based on their
            minimum and maximum values.
        **/
        private calcDataPointPercentages(dataArray) {

            // calc min, max and range
            var len = dataArray.length;
            var min;
            var max;
            var range;
            var curVal;
            var i;
            for (i = 0; i < len; i++) {
                curVal = dataArray[i];
                if ((min == null) || (curVal < min)) { min = curVal; }
                if ((max == null) || (curVal > max)) { max = curVal; }
            }
            range = max - min;

            // calc percentages
            var offsetFromMin;
            var percentageVal;
            var percentageArray = new Array();
            for (i = 0; i < len; i++) {
                curVal = dataArray[i];
                offsetFromMin = curVal - min;
                percentageVal = offsetFromMin / (range / 100);
                percentageArray.push(percentageVal);
            }
            return percentageArray;
        }

        /** 
            Draw a d3 text object starting from bottom left corner co-ordinate 
        **/
        private drawText(canvasSvg: D3.Selection, x: number, y: number, text: string, textStyle: ITextStyle): D3.Selection {
            var labelOpacity = 1;   // this.settings.labels.opacity;
            var labelColor:string = textStyle.color.value;
            var labelFont:string = textStyle.fontFace;
            var labelFontSize: string = textStyle.fontSize;
            var txt: D3.Selection = canvasSvg.append("text")
                .attr("x", x)
                .attr("y", y)
                .text(text);
            txt.style({
                'font-family': labelFont,
                'fill': labelColor,
                'font-size': labelFontSize,
                'fill-opacity': labelOpacity
            });
            return txt;
        }

        /**
            Wrap a long text object by creating sub tspan elements 
            one for each line.
        **/
        private drawTextWithWrap(canvasSvg: D3.Selection, x: number, y: number, text: string,
            textStyle: ITextStyle, id: string, wrapWidth: number): D3.Selection {
            var txt: D3.Selection = this.drawText(canvasSvg, x, y, text, textStyle);
            txt.attr("dy", 0)
                .attr("id", id)
                .call(this.wrap, wrapWidth);
            return txt;
        }

        /** 
            Clever text wrapping script written by mbostock 
        **/
        private wrap(text, width) {
            text.each(
                function () {
                    var text = d3.select(this),
                        words = text.text().split(/\s+/).reverse(),
                        word,
                        line = [],
                        lineNumber = 0,
                        lineHeight = 1.1, // ems
                        y = text.attr("y"),
                        x = text.attr("x"),
                        dy = parseFloat(text.attr("dy")),
                        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
                    while (word = words.pop()) {
                        line.push(word);
                        tspan.text(line.join(" "));
                        var node: SVGTSpanElement = <SVGTSpanElement>tspan.node();
                        var hasGreaterWidth = node.getComputedTextLength() > width;
                        if (hasGreaterWidth) {
                            line.pop();
                            tspan.text(line.join(" "));
                            line = [word];
                            tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                        }
                    }
                }
            );
        }
    }
}

/* Creating IVisualPlugin that is used to represent IVisual. */
//
// Uncomment it to see your plugin in "PowerBIVisualsPlayground" plugins list
// Remember to finally move it to plugins.ts
//
//module powerbi.visuals.plugins {
//    export var TadpoleSparkGridVisual: IVisualPlugin = {
//        name: 'TadpoleSparkGridVisual',
//        capabilities: TadpoleSparkGridVisual.capabilities,
//        create: () => new TadpoleSparkGridVisual()
//    };
//}