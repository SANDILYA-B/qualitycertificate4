sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'qualitycertificate/test/integration/FirstJourney',
		'qualitycertificate/test/integration/pages/quality1List',
		'qualitycertificate/test/integration/pages/quality1ObjectPage'
    ],
    function(JourneyRunner, opaJourney, quality1List, quality1ObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('qualitycertificate') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onThequality1List: quality1List,
					onThequality1ObjectPage: quality1ObjectPage
                }
            },
            opaJourney.run
        );
    }
);