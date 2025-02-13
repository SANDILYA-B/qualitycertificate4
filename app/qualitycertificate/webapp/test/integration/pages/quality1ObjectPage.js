sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'qualitycertificate',
            componentId: 'quality1ObjectPage',
            contextPath: '/quality1'
        },
        CustomPageDefinitions
    );
});