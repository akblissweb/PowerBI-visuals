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
 *  Angry Koala Tadpole Spark Grid Plus Visualization 
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
 *  The plus features allow you to overlay two measure columns on the same chart position
 *  The first column measure (eg. last year) is shown in light grey, and the second
 *  measure (eg. this year) is shown with the positive/negative color highlighting.
 *  The colors in overlay mode represent a comparison with the same period in the 
 *  first measure.  (eg.  this year / last year    or  budget  /  actual )
 *
 *  Overlay mode can be toggled on and off using a switch in the panel.
 *
 */

/* Please make sure that this path is correct */
/// <reference path="../_references.ts"/>

module powerbi.visuals {

    export interface TadpoleSparkGridPlusViewModel {
        periodData: any[];
        rowHeaders: any[];
        colHeaders: any[];
        colFormats: any[];
    };

    interface TadpoleSparkGridPlusVisualStyle {
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

    export class TadpoleSparkGridPlus implements IVisual {

        private static DefaultStyleProperties: TadpoleSparkGridPlusVisualStyle = {
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

        private viewModel: TadpoleSparkGridPlusViewModel;
        private settings: TadpoleSparkGridPlusVisualStyle;

        private svg: D3.Selection;
        private scrollingDiv: D3.Selection;
        private canvas: D3.Selection;

        private dataView: DataView;
        private options: VisualUpdateOptions;
        private style: IVisualStyle;
        private colors: IDataColorPalette;
        private lessIsGood: boolean;
        private overlayMode: boolean = true;
        private static COMPARE_LINE_STYLE_GREY: string = 'comparisonLineStyleGrey';
        private static COMPARE_LINE_STYLE_COLORED: string = 'comparisonLineStyleColored';

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [];
            if (options.objectName === 'general') {
                //var objects = this.getMatrixDataViewObjects();
                instances.push({
                    selector: null,
                    properties: {
                        lessIsGood: this.getLessIsGood(this.dataView)
                    },
                    objectName: options.objectName
                });
                instances.push({
                    selector: null,
                    properties: {
                        overlayMode: this.getOverlayMode(this.dataView)
                    },
                    objectName: options.objectName
                });
            }
            return instances;
        }

        // This gets the lessIsGood property from the DataView
        private getLessIsGood(dataView: DataView): boolean {
            var newLessIsGood: boolean = false;
            if (dataView && dataView.metadata.objects) {
                newLessIsGood = Boolean(dataView.metadata.objects['general']['lessIsGood']);
            } else {
                this.lessIsGood = false;
            }
            if (newLessIsGood !== this.lessIsGood) {
                // if it has changed then redraw the charts grid
                this.lessIsGood = newLessIsGood;
                this.update(this.options);
            }
            return this.lessIsGood;
        }

        // This gets the newOverlayMode property from the DataView
        private getOverlayMode(dataView: DataView): boolean {
            var newOverlayMode: boolean = false;
            if (dataView && dataView.metadata.objects) {
                newOverlayMode = Boolean(dataView.metadata.objects['general']['overlayMode']);
            } else {
                this.overlayMode = false;
            }
            if (newOverlayMode !== this.overlayMode) {
                // if it has changed then redraw the charts grid
                this.overlayMode = newOverlayMode;
                this.update(this.options);
            }
            // SJB - temp hardcode to true for testing 
            //this.overlayMode = true;
            return this.overlayMode;
        }

        // Convert a DataView into a view model
        public static converter(dataView: DataView): TadpoleSparkGridPlusViewModel {
            var viewModel: TadpoleSparkGridPlusViewModel = TadpoleSparkGridPlus.processMatrixModel(dataView);
            return viewModel;
        }

        public static processMatrixModel(dataView: DataView): TadpoleSparkGridPlusViewModel {

            var viewModel: TadpoleSparkGridPlusViewModel = {
                colHeaders: [],
                rowHeaders: [],
                periodData: [],
                colFormats: []
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
                            arr = TadpoleSparkGridPlus.addChildDetailsToArray(rowNodes[rowNo], arr, startDepth, targetDepth);
                        }
                        var colHeadersArr: any[] = TadpoleSparkGridPlus.buildColHeadersArr(colNodes);
                        viewModel.colHeaders = colHeadersArr;
                        viewModel.rowHeaders = TadpoleSparkGridPlus.buildRowHeadersArr(arr);
                        viewModel.periodData = TadpoleSparkGridPlus.buildChartMeasuresArr(arr, colHeadersArr);;
                        viewModel.colFormats = TadpoleSparkGridPlus.buildColFormatsArr(dataView.matrix);
                    }
                }
            }

            return viewModel;
        }

        /* get the format strings for all the columns
           sure there's a much better way of getting this, but don't have time to find it 
        */
        public static buildColFormatsArr(matrix: DataViewMatrix): any[]{
            var colFormatsArr: any[] = [];
            var metaColArr: DataViewMetadataColumn[] = matrix.valueSources;
            var i: number;
            var len: number = metaColArr.length;
            var curCol: DataViewMetadataColumn;
            for (i = 0; i < len; i++) {
                curCol = metaColArr[i];
                colFormatsArr.push(TadpoleSparkGridPlus.getFormatStringForColumn(curCol));
            }
            return colFormatsArr;
        }

        /* get the format string for a column
           sure there's a much better way of getting this, but don't have time to find it 
        */
        public static getFormatStringForColumn(metaCol: DataViewMetadataColumn): any {
            var formatString: any = metaCol.objects['general']['formatString'];
            return formatString;
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
                        arr = TadpoleSparkGridPlus.addChildDetailsToArray(curChildNode, arr, curDepth + 1, targetDepth);
                    }
                }
            } else {
                arr.push(node); // Canada level
            }
            return arr;
        }

        /* One time setup*/
        public init(options: VisualInitOptions): void {
            this.settings = TadpoleSparkGridPlus.DefaultStyleProperties;

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
            var viewModel: TadpoleSparkGridPlusViewModel = this.viewModel = TadpoleSparkGridPlus.converter(dataView);

            this.getLessIsGood(dataView);
            this.getOverlayMode(dataView);

            var height = options.viewport.height;
            var width = options.viewport.width;

            // make sure the canvas and the svg widths default to the screen size
            this.canvas.attr("width", width + 'px');
            this.canvas.attr("height", height + 'px');
            this.svg.attr("width", width + 'px');
            this.svg.attr("height", height + 'px');

            // draw the charts, which will increase the svg and canvas size if necessary and enable the div to scroll
            this.drawChartRows(this.canvas, viewModel.periodData, viewModel.rowHeaders, viewModel.colHeaders, width, height, this.overlayMode);

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
        private drawChartRows(canvasSvg, data, rowHeadings, colHeadings, width, height, compareMode: boolean) {

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

            // set compare mode flags to allow us to overlay charts
            // assume regular
            var startCol = 0;
            var colIncrement = 1;
            // if compare mode, go through columns in sets of 2
            if (compareMode) {
                startCol = 1;
                colIncrement = 2;
            }

            // draw column headers
            var drawnColumnIndex: number = 0;
            var noCols = colHeadings.length;
            var colHeaderY = yOffset;    /// (yOffset + colHeaderHeight) - ((colHeaderHeight - textHeight) / 2);
            var l;
            var id;
            for (l = startCol; l < noCols; l = l + colIncrement) {

                // calculate column x position
                var colHeaderX = xOffset + rowHeaderWidth + (drawnColumnIndex * (gridColWidth));

                // draw column headers
                //id = "colHeader" + l;
                //this.drawTextWithWrap(canvasSvg, colHeaderX, colHeaderY, colHeadings[l], textStyle, id, gridColWidth - 10);
                //colHeaderElementIds.push(id);

                // draw column headers
                id = "colHeader" + l;
                this.drawTextWithWrap(canvasSvg, colHeaderX, colHeaderY, colHeadings[l], textStyle, id, gridColWidth - 10);
                colHeaderElementIds.push(id);

                // in compare mode we only draw a column for every 2 columns of data, so keep track here
                drawnColumnIndex++;
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
            var comparisonDataPoints: any[];
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

                drawnColumnIndex = 0;

                // draw each column of data
                for (k = startCol; k < noCols; k = k + colIncrement) {

                    // calculate column x position
                    chartX = xOffset + rowHeaderWidth + (drawnColumnIndex * (gridColWidth));
                    chartY = yOffset + ((gridRowHeight - chartHeight) / 2);

                    // draw data point chart and background
                    //dataPoints = data[k][j];
                    //rect = this.drawRectangle(canvasSvg, chartX, chartY, chartWidth, chartHeight, chartBgColor);
                    //this.drawTadpoleSparkChart(canvasSvg, dataPoints, chartWidth, chartHeight, upGood, chartX, chartY);

                    // draw chart background
                    rect = this.drawRectangle(canvasSvg, chartX, chartY, chartWidth, chartHeight, chartBgColor);
                    // draw data point chart 
                    if (compareMode) {
                        // draw compare chart in the background in feint grey
                        dataPoints = data[k - 1][j];
                        this.drawTadpoleSparkChart(canvasSvg, dataPoints, chartWidth, chartHeight, upGood,
                                                              chartX, chartY, TadpoleSparkGridPlus.COMPARE_LINE_STYLE_GREY);
                        dataPoints = data[k][j];
                        comparisonDataPoints = data[k - 1][j];
                        this.drawTadpoleSparkChart(canvasSvg, dataPoints, chartWidth, chartHeight, upGood,
                                                              chartX, chartY, TadpoleSparkGridPlus.COMPARE_LINE_STYLE_COLORED, comparisonDataPoints);
                    } else {
                        // non compare mode
                        dataPoints = data[k][j];
                        this.drawTadpoleSparkChart(canvasSvg, dataPoints, chartWidth, chartHeight, upGood, chartX, chartY); 
                    }

                    // in compare mode we only draw a column for every 2 columns of data, so keep track here
                    drawnColumnIndex++;

                    // create data object including tool tip info
                    dataObj = this.createToolTipDataObj(dataPoints, j, k, compareMode, comparisonDataPoints);
                    rect.data(dataObj);

                    TooltipManager.addTooltip(rect, (tooltipEvent: TooltipEvent) => tooltipEvent.data.toolTipInfo);

                }
                yOffset = yOffset + chartHeight + verticalSpacing;
            }
        }

        private createToolTipDataObj(dataPoints: any[], row: number, col: number, compareMode: boolean, comparisonDataPoints: any[]): any[]{
            var toolTipInfo: TooltipDataItem[] = [];
            // add row headers
            item = this.createToolTipDataItem(this.viewModel.rowHeaders[row], "");
            toolTipInfo.push(item);
            // add column header
            var mainMeasureDesc: string = this.viewModel.colHeaders[col];
            var measureDetailsHeader: string = mainMeasureDesc;
            if (compareMode) {
                var compareMeasureDesc: string = "  [" + this.viewModel.colHeaders[col-1] + "]";
                measureDetailsHeader = mainMeasureDesc + compareMeasureDesc;
            }
            item = this.createToolTipDataItem(measureDetailsHeader, "");
            toolTipInfo.push(item);
            // add chart data points
            var len = dataPoints.length;
            var i;
            var item: TooltipDataItem;
            var formattedCurValue: string;
            var curValueFormatString: string;
            var formattedCompareValue: string;
            var compareValueFormatString: string;
            var toolTipValue: string;
            for (i = 0; i < len; i++) {
                // not the best way of formatting the value, can be improved
                // but better than nothing for now
                curValueFormatString = this.viewModel.colFormats[col];
                formattedCurValue = valueFormatter.format(dataPoints[i][2], curValueFormatString);
                if (compareMode) {
                    compareValueFormatString = this.viewModel.colFormats[col - 1];
                    formattedCompareValue = valueFormatter.format(comparisonDataPoints[i][2], compareValueFormatString);
                    // attempting to pad the values, but the toolTip info manager has its own style and removes it
                    toolTipValue = this.pad(formattedCurValue, 20) + "   [" + this.pad(formattedCompareValue,20) + "]";
                } else {
                    toolTipValue = this.pad(formattedCurValue,20);
                }
                item = this.createToolTipDataItem(dataPoints[i][0], toolTipValue);
                toolTipInfo.push(item);
            }
            var dataObj = [{ toolTipInfo: toolTipInfo }];
            return dataObj;
        }

        // pads a string with leading spaces to a particular length
        private pad(str: string, len: number): string {
            var padChar: string = ' ';
            var pad = Array(256).join(padChar); // make a string of 255 spaces
            var padded = (pad + str).slice(-len);
            return padded;
        }

        // calculates the maximum length string in an array of strings
        // not used at present, anyway the padding doesn't work in the tooltip
        //private calcMaxStringLength(arr: string[]): number {
        //    var len: number = arr.length;
        //    var i: number;
        //    var curLen: number;
        //    var maxLen: number = 0;
        //    for (i = 0; i < len; i++) {
        //        curLen = arr[i].length;
        //        if (curLen > maxLen) {
        //            maxLen = curLen;
        //        }
        //    };
        //    return maxLen;
        //}

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

        private drawTadpoleSparkChart(canvasSvg: D3.Selection, yDataPoints: any[], width: number, height: number,
            upGood: boolean, xOffset: number, yOffset: number, compareLineStyle: string = null, comparisonDataPoints: any[] = null) { 

            var yDataPointsValues:any[] = this.getValuesFromPoints(yDataPoints);
            var yDataPointsPercentages: any[] = this.calcDataPointPercentages(yDataPointsValues);
            if ((compareLineStyle === TadpoleSparkGridPlus.COMPARE_LINE_STYLE_COLORED) && (comparisonDataPoints != null)) {
                var yDataPointsComparisonValues = this.getValuesFromPoints(comparisonDataPoints);
                var multiSetPercentages = this.calcMultiSetDataPointPercentages([yDataPointsValues, yDataPointsComparisonValues]);
                yDataPointsPercentages = multiSetPercentages[0];
                var yDataPointsComparisonPercentages = multiSetPercentages[1];
            }
            var compareColor = '#999999';
            var compareOpacity = 0.8;
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

                var lastYpct: number;
                var nextYpct: number;
                var comparisonYpct: number;
                
                var compareColor: string;
                var compareOpacity: number;

                nextYpct = yDataPointsPercentages[i];
                lastYpct = yDataPointsPercentages[i - 1];
                if (compareLineStyle === TadpoleSparkGridPlus.COMPARE_LINE_STYLE_COLORED) {
                    // comparing with comparison(e.g.last year) measure value
                    comparisonYpct = yDataPointsComparisonPercentages[i];
                    good = this.calcLineGood(comparisonYpct, nextYpct, upGood);
                } else {
                    // normal good test
                    good = this.calcLineGood(lastYpct, nextYpct, upGood);
                }

                if (compareLineStyle === TadpoleSparkGridPlus.COMPARE_LINE_STYLE_GREY) {
                    // do a feint grey line with same thickness
                    color = compareColor;
                    opacity = compareOpacity;
                    thickness = defaultThickness;
                } else {
                    // do the normal line styling
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

        private calcLineGood(point1: number, point2: number, upGood: boolean): boolean {
            var good: boolean;
            if (upGood) {
                good = Boolean(point2 >= point1);
            } else {
                good = Boolean(point2 <= point1);
            }
            return good;
        }

        private calcMultiSetDataPointPercentages(multiDataArray:any[]) {
            var multiPercentageArray = [];
            var noDataSets = multiDataArray.length;
            var min: number;
            var max: number;
            var range: number;
            var dataSetIndex: number;
            var dataItemArr: number[];
            var dataItemIndex: number;
            var noDataItems: number;
            var curVal: number;
            // calc min, max and range
            for (dataSetIndex = 0; dataSetIndex < noDataSets; dataSetIndex++) {
                dataItemArr = multiDataArray[dataSetIndex];
                noDataItems = dataItemArr.length;
                for (dataItemIndex = 0; dataItemIndex < noDataItems; dataItemIndex++) {
                    curVal = dataItemArr[dataItemIndex];
                    if ((min == null) || (curVal < min)) { min = curVal; }
                    if ((max == null) || (curVal > max)) { max = curVal; }
                }
            }
            range = max - min;

            // go through each dataset and calculate percentages based on both sets
            var percentageArr: number[];
            for (dataSetIndex = 0; dataSetIndex < noDataSets; dataSetIndex++) {
                dataItemArr = multiDataArray[dataSetIndex];
                percentageArr = this.calcDataPointPercentagesByRange(dataItemArr, min, max, range);
                multiPercentageArray.push(percentageArr);
            }
            return multiPercentageArray;
        }

        private calcDataPointPercentages(dataArray: number[]):number[] {
            var len: number = dataArray.length;
            var min: number; 
            var max: number; 
            var range: number;
            var percentageArray: number[];
            var i: number;
            var curVal: number;
            // calc min, max and range
            for (i = 0; i < len; i++) {
                curVal = dataArray[i];
                if ((min == null) || (curVal < min)) { min = curVal; }
                if ((max == null) || (curVal > max)) { max = curVal; }
            }
            range = max - min;
            percentageArray = this.calcDataPointPercentagesByRange(dataArray, min, max, range);
            return percentageArray;
        }

        private calcDataPointPercentagesByRange(dataArray: number[], min: number, max: number, range: number): number[] {

            // calc percentages
            var len: number = dataArray.length;
            var percentageArray: number[] = [];
            var i: number;
            var curVal: number;
            var offsetFromMin: number;
            var percentageVal: number;
            for (i = 0; i < len; i++) {
                curVal = dataArray[i];
                // test for non-existant data point
                if (curVal != null) {
                    offsetFromMin = curVal - min;
                    // cater for zero range
                    if (range > 0) {
                        percentageVal = offsetFromMin / (range / 100);
                    } else {
                        percentageVal = 0;
                    }
                } else {
                    // mark as -1 percentage to indicate missing data point
                    // to chart drawing routine
                    percentageVal = -1;
                }
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
//    export var TadpoleSparkGridPlusVisual: IVisualPlugin = {
//        name: 'TadpoleSparkGridPlusVisual',
//        capabilities: TadpoleSparkGridPlusVisual.capabilities,
//        create: () => new TadpoleSparkGridPlusVisual()
//    };
//}