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
 */

/// <reference path="../_references.ts"/>

module powerbi.visuals {
    export var tadpoleSparkGridPlusRoleNames = {
        rows: 'Rows',
        columns: 'Columns',
        values: 'Values',
    };

    export var tadpoleSparkGridPlusCapabilities: VisualCapabilities = {
        dataRoles: [
            {
                name: tadpoleSparkGridPlusRoleNames.rows,
                kind: VisualDataRoleKind.Grouping
            },
            {
                name: tadpoleSparkGridPlusRoleNames.values,
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
                    overlayMode: {
                        type: { bool: true },
                        displayName: 'Overlay Mode'
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
                targetRoles: [tadpoleSparkGridPlusRoleNames.rows]
            }
        },
        sorting: {
            custom: {},
        },
        suppressDefaultTitle: true,
    }; 
}