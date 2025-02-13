sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'qualitycertificate',
            componentId: 'quality1List',
            contextPath: '/quality1'
        },
        CustomPageDefinitions
    );
});