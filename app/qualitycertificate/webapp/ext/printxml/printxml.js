sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/ui/core/HTML"
], function(MessageToast, JSONModel, Dialog, Button, HTML) {
    'use strict';

    return {
        printForm: function(oBindingContext, aSelectedContexts) {
            console.log(aSelectedContexts);
            let mParameters = {
                contexts: aSelectedContexts[0],
                label: 'Confirm',
                invocationGrouping: true    
            };
            this.editFlow.invokeAction('qualitycertificate.printForm', mParameters)
                .then(function(result) {
                    let base64PDF = result.getObject().value;  
                    console.log(base64PDF);
                    const byteCharacters = atob(base64PDF);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }   
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const pdfUrl = URL.createObjectURL(blob);

                    // Directly display PDF in the dialog without any input box
                    const oHtml = new HTML({
                        content: `<iframe src="${pdfUrl}" width="100%" height="500px"></iframe>`
                    });

                    let oDialog = new Dialog({
                        title: 'Generated PDF',
                        contentWidth: "600px",
                        contentHeight: "500px",
                        verticalScrolling: true,
                        content: oHtml,
                        buttons: [
                            new Button({
                                text: 'Download',
                                press: function () {
                                    const link = document.createElement('a');
                                    link.href = pdfUrl;
                                    link.download = 'generated_pdf.pdf'; 
                                    link.click();  
                                }
                            }),
                            new Button({
                                text: 'Close',
                                press: function () {
                                    oDialog.close();
                                }
                            })
                        ],
                        afterClose: function() {
                            oDialog.destroy();
                        }
                    });

                    oDialog.open();
                    
                })
        }
    };
});

// sap.ui.define([
//     "sap/m/MessageToast",
//     "sap/m/Dialog",
//     "sap/m/Text",
//     "sap/m/TextArea",
//     "sap/m/Button"
// ], function (MessageToast, Dialog, Text, TextArea, Button) {
//     'use strict';

//     return {
//         printXml: function (oBindingContext, aSelectedContexts) {
//             MessageToast.show("Custom handler invoked.");
//             console.log(aSelectedContexts);

//             if (!aSelectedContexts || aSelectedContexts.length === 0) {
//                 MessageToast.show("No items selected.");
//                 return;
//             }

//             let mParameters = {
//                 contexts: aSelectedContexts[0],
//                 label: 'Confirm',
//                 invocationGrouping: true
//             };

//             var oStatusText = new Text({ text: "Fetching XML Data..." });
//             var oXMLDataTextArea = new TextArea({
//                 width: "100%",
//                 rows: 20,
//                 editable: false,
//                 value: ""
//             });

//             var oDialog = new Dialog({
//                 title: "Inspection Lot XML Data",
//                 content: [oStatusText, oXMLDataTextArea],
//                 beginButton: new Button({
//                     text: "Download XML",
//                     press: function () {
//                         var xmlData = oXMLDataTextArea.getValue();
//                         if (xmlData) {
//                             var blob = new Blob([xmlData], { type: "application/xml" });
//                             var link = document.createElement("a");
//                             link.href = URL.createObjectURL(blob);
//                             link.download = "quality_certificate.xml";
//                             document.body.appendChild(link);
//                             link.click();
//                             document.body.removeChild(link);
//                             MessageToast.show("XML file downloaded.");
//                         } else {
//                             MessageToast.show("No XML data available to download.");
//                         }
//                     }
//                 }),
//                 endButton: new Button({
//                     text: "Close",
//                     press: function () {
//                         oDialog.close();
//                     }
//                 })
//             });

//             oDialog.open();

//             this.editFlow.invokeAction('quality1.printForm', mParameters)
//                 .then(function (result) {
//                     const xmlData = result.getObject().value;
//                     oXMLDataTextArea.setValue(xmlData);
//                     oStatusText.setText("XML Data fetched successfully.");
//                 })
//                 .catch(function (error) {
//                     console.error("Error fetching XML data:", error);
//                     oStatusText.setText("Error fetching XML data.");
//                     MessageToast.show("Failed to fetch XML data.");
//                 });
//         }
//     };
// });

