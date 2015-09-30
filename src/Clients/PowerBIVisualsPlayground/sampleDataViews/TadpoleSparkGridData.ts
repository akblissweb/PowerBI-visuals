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
*  Angry Koala Tadpole Spark Grid Visualization - Sample data
*  Visual Plugin for Microsoft Power BI Visualizations
*  Author: Shaun Bliss, Angry Koala Pty Ltd. (blissweb@hotmail.com)   
*  Creation Date: September 2015
* 
*  Provides a special version of the Matrix sample data to include 
*  a set of month periods at the lowest level.
*  Also includes a working Random() generator, missing from the
*  current matrix sample data.
*  
*
*/

/// <reference path="../_references.ts"/>

module powerbi.visuals.sampleDataViews {
    import ValueType = powerbi.ValueType;
    import PrimitiveType = powerbi.PrimitiveType;
    
    export class TadpoleSparkGridData extends SampleDataViews implements ISampleDataViewsMethods {

        public name: string = "TadpoleSparkGridData";
        public displayName: string = "Tadpole spark grid data";

        public visuals: string[] = ['tadpoleSparkGrid'
        ];

        private sampleData: number[] = [
            10, 20.38209309439, 30,
            10, 50.3242343234, 20,
            10, 80.22333, 90,
            10, 0.0032, 20,
            10, 40, 50.87887784,
            10, 70, 80,
            10, 100, 0,
            20, 30, 40.7883726,
            50.832988483, 60, 70,
            80.8328839, 90, 100,
            0, 20, 30,
            40, 50, 60, 70, 80, 90, 100,
            0, 20, 30, 40, 50, 60, 70, 80, 90, 100,
            0, 20, 30, 40, 50, 60, 70, 80, 90, 100,
            0, 20, 30, 40, 50, 60, 70, 80, 90, 100,
            0, 20, 30, 40, 50, 60, 70, 80, 90, 100,
            120, 10, 20,10
            ];
        private sampleMin: number = 50;
        private sampleMax: number = 1500;

        public getDataViews(): DataView[]{

            //this.randomize();

            var dataTypeNumber = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double);
            var dataTypeString = ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text);
            
            var measureSource1: DataViewMetadataColumn = { displayName: 'measure1', type: dataTypeNumber, isMeasure: true, index: 3, objects: { general: { formatString: '#.0' } } };
            var measureSource2: DataViewMetadataColumn = { displayName: 'measure2', type: dataTypeNumber, isMeasure: true, index: 4, objects: { general: { formatString: '#.00' } } };
            var measureSource3: DataViewMetadataColumn = { displayName: 'measure3', type: dataTypeNumber, isMeasure: true, index: 5, objects: { general: { formatString: '#' } } };

            var rowGroupSource1: DataViewMetadataColumn = { displayName: 'RowGroup1', queryName: 'RowGroup1', type: dataTypeString, index: 0 };
            var rowGroupSource2: DataViewMetadataColumn = { displayName: 'RowGroup2', queryName: 'RowGroup2', type: dataTypeString, index: 1 };
            var rowGroupSource3: DataViewMetadataColumn = { displayName: 'RowGroup3', queryName: 'RowGroup3', type: dataTypeString, index: 2 };

            var matrixThreeMeasuresThreeRowGroups: DataViewMatrix = {
                rows: {
                    root: {
                        children: [
                            {
                                level: 0,
                                value: 'North America',
                                children: [
                                    {
                                        level: 1,
                                        value: 'Canada',
                                        children: [
                                            {
                                                level: 2,
                                                value: 'Jan 2014',
                                                values: {
                                                    0: { value: this.sampleData[0] },
                                                    1: { value: this.sampleData[1], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[2], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Feb 2014',
                                                values: {
                                                    0: { value: this.sampleData[3] },
                                                    1: { value: this.sampleData[4], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[5], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Mar 2014',
                                                values: {
                                                    0: { value: this.sampleData[6] },
                                                    1: { value: this.sampleData[7], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[8], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Apr 2014',
                                                values: {
                                                    0: { value: this.sampleData[9] },
                                                    1: { value: this.sampleData[10], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[11], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'May 2014',
                                                values: {
                                                    0: { value: this.sampleData[12] },
                                                    1: { value: this.sampleData[13], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[14], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Jun 2014',
                                                values: {
                                                    0: { value: this.sampleData[15] },
                                                    1: { value: this.sampleData[16], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[17], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Jul 2014',
                                                values: {
                                                    0: { value: this.sampleData[18] },
                                                    1: { value: this.sampleData[19], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[20], valueSourceIndex: 2 }
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        level: 1,
                                        value: 'USA',
                                        children: [
                                            {
                                                level: 2,
                                                value: 'Jan 2014',
                                                values: {
                                                    0: { value: this.sampleData[21] },
                                                    1: { value: this.sampleData[22], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[23], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Feb 2014',
                                                values: {
                                                    0: { value: this.sampleData[24] },
                                                    1: { value: this.sampleData[25], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[26], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Mar 2014',
                                                values: {
                                                    0: { value: this.sampleData[27] },
                                                    1: { value: this.sampleData[28], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[29], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Apr 2014',
                                                values: {
                                                    0: { value: this.sampleData[30] },
                                                    1: { value: this.sampleData[31], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[32], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'May 2014',
                                                values: {
                                                    0: { value: this.sampleData[33] },
                                                    1: { value: this.sampleData[34], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[35], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Jun 2014',
                                                values: {
                                                    0: { value: this.sampleData[36] },
                                                    1: { value: this.sampleData[37], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[38], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Jul 2014',
                                                values: {
                                                    0: { value: this.sampleData[39] },
                                                    1: { value: this.sampleData[40], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[41], valueSourceIndex: 2 }
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                level: 0,
                                value: 'South America',
                                children: [
                                    {
                                        level: 1,
                                        value: 'Brazil',
                                        children: [
                                            {
                                                level: 2,
                                                value: 'Jan 2014',
                                                values: {
                                                    0: { value: this.sampleData[42] },
                                                    1: { value: this.sampleData[43], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[44], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Feb 2014',
                                                values: {
                                                    0: { value: this.sampleData[45] },
                                                    1: { value: this.sampleData[46], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[47], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Mar 2014',
                                                values: {
                                                    0: { value: this.sampleData[48] },
                                                    1: { value: this.sampleData[49], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[50], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Apr 2014',
                                                values: {
                                                    0: { value: this.sampleData[51] },
                                                    1: { value: this.sampleData[52], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[53], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'May 2014',
                                                values: {
                                                    0: { value: this.sampleData[54] },
                                                    1: { value: this.sampleData[55], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[56], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Jun 2014',
                                                values: {
                                                    0: { value: this.sampleData[57] },
                                                    1: { value: this.sampleData[58], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[59], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Jul 2014',
                                                values: {
                                                    0: { value: this.sampleData[60] },
                                                    1: { value: this.sampleData[61], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[62], valueSourceIndex: 2 }
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        level: 1,
                                        value: 'Chile',
                                        children: [
                                            {
                                                level: 2,
                                                value: 'Jan 2014',
                                                values: {
                                                    0: { value: this.sampleData[63] },
                                                    1: { value: this.sampleData[64], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[65], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Feb 2014',
                                                values: {
                                                    0: { value: this.sampleData[66] },
                                                    1: { value: this.sampleData[67], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[68], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Mar 2014',
                                                values: {
                                                    0: { value: this.sampleData[69] },
                                                    1: { value: this.sampleData[70], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[71], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Apr 2014',
                                                values: {
                                                    0: { value: this.sampleData[72] },
                                                    1: { value: this.sampleData[73], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[74], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'May 2014',
                                                values: {
                                                    0: { value: this.sampleData[75] },
                                                    1: { value: this.sampleData[76], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[77], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Jun 2014',
                                                values: {
                                                    0: { value: this.sampleData[78] },
                                                    1: { value: this.sampleData[79], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[80], valueSourceIndex: 2 }
                                                }
                                            },
                                            {
                                                level: 2,
                                                value: 'Jul 2014',
                                                values: {
                                                    0: { value: this.sampleData[81] },
                                                    1: { value: this.sampleData[82], valueSourceIndex: 1 },
                                                    2: { value: this.sampleData[83], valueSourceIndex: 2 }
                                                }
                                            }
                                        ]
                                    }
                                ]
                            },

                        ]
                    },
                    levels: [
                        { sources: [rowGroupSource1] },
                        { sources: [rowGroupSource2] },
                        { sources: [rowGroupSource3] }
                    ]
                },
                columns: {
                    root: {
                        children: [
                            { level: 0 },
                            { level: 0, levelSourceIndex: 1 },
                            { level: 0, levelSourceIndex: 2 }
                        ]
                    },
                    levels: [{
                        sources: [
                            measureSource1,
                            measureSource2,
                            measureSource3
                        ]
                    }]
                },
                valueSources: [
                    measureSource1,
                    measureSource2,
                    measureSource3
                ]
            };

            return [{
                metadata: { columns: [rowGroupSource1, rowGroupSource2, rowGroupSource3], segment: {} },
                matrix: matrixThreeMeasuresThreeRowGroups
            }];
        }

        public randomize(): void {
            this.sampleData = this.sampleData.map(() => this.getRandomValue(this.sampleMin, this.sampleMax));
        }
        
    }
}