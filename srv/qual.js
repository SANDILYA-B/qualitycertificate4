const cds = require("@sap/cds");
const { create } = require('xmlbuilder2');
const axios = require('axios');

module.exports = cds.service.impl(async function () {
  const inspect = await cds.connect.to("API_INSPECTIONLOT_SRV");
  const outbound = await cds.connect.to("API_OUTBOUND_DELIVERY_SRV_0002");
  const sales = await cds.connect.to("API_SALES_ORDER_SRV");
  const business = await cds.connect.to("API_BUSINESS_PARTNER");

  this.on('READ', 'inslot', async (req) => {
    try {
      return await inspect.run(req.query);
    } catch (error) {
      console.error('Error reading inspection lot:', error);
      return req.error(500, `Error reading inspection lot: ${error.message}`);
    }
  });

  this.on('READ', 'inschar', async (req) => {
    try {
      return await inspect.run(req.query);
    } catch (error) {
      console.error('Error reading inspection characteristics:', error);
      return req.error(500, `Error reading inspection characteristics: ${error.message}`);
    }
  });

  this.on('READ', 'insres', async (req) => {
    try {
      return await inspect.run(req.query);
    } catch (error) {
      console.error('Error reading inspection results:', error);
      return req.error(500, `Error reading inspection results: ${error.message}`);
    }
  });

  this.on('READ', 'obitem', async (req) => {
    try {
      return await outbound.run(req.query);
    } catch (error) {
      console.error('Error reading outbound item:', error);
      return req.error(500, `Error reading outbound item: ${error.message}`);
    }
  });

  this.on('READ', 'obaddr', async (req) => {
    try {
      return await outbound.run(req.query);
    } catch (error) {
      console.error('Error reading outbound address:', error);
      return req.error(500, `Error reading outbound address: ${error.message}`);
    }
  });


  const { obitem, inslot, obaddr, insres, inschar, salesodr, buss, Label } = this.entities;

  this.before('CREATE', 'quality1', async req => {
    try {
      const nquery = SELECT.from('com.satinfotech.quality.numberrange')
        .where({ object_name: 'outboundqc' });
      
      const res = await cds.run(nquery);
      
      if (!res || res.length === 0) {
        return req.error({ 
          code: 'NOOUTBNUM', 
          message: 'Outbound Number Not Set, Please set the Number Range' 
        });
      }

      const currentNum = res[0].current_num;
      const fromNum = res[0].from_num;
      const toNum = res[0].to_num;
      const new_num = currentNum ? Number(currentNum) + 1 : Number(fromNum) + 1;

      if (new_num > toNum) {
        return req.error({
          code: 'NUMRANGE_EXCEEDED',
          message: 'Number range limit exceeded. Please update the number range.'
        });
      }

      await cds.run(
        UPDATE('com.satinfotech.quality.numberrange')
          .set({ current_num: new_num })
          .where({ object_name: 'outboundqc' })
      );

      req.data.certno = String(new_num).padStart(10, '0');
    } catch (error) {
      console.error('Error generating certificate number:', error);
      return req.error(500, `Error generating certificate number: ${error.message}`);
    }
  });

  this.on('printForm', 'quality1', async (req) => {
    try {
      const out_ids = req.params[0]?.ID;
      if (!out_ids) {
        return req.error(400, "Missing ID parameter");
      }
  
      const post = await cds.run(SELECT.from('com.satinfotech.quality.quality1').where({ ID: out_ids }));
      if (!post || post.length === 0) {
        return req.error(404, "Quality record not found");
      }
  
      const outboundId = post[0].outbound;
      const outboundItem = post[0].outbounditem;
  
      // Get Outbound Delivery Item
      const obItemQuery = await outbound.run(
        SELECT.from(obitem).where({ 
          DeliveryDocument: outboundId, 
          DeliveryDocumentItem: outboundItem 
        })
      );
  
      if (!obItemQuery || !obItemQuery.length) {
        return req.error(404, "Outbound item not found");
      }
  
      const { Batch, Material, ReferenceSDDocument } = obItemQuery[0];

      const salesOrderQuery = await sales.run(
        SELECT.from(salesodr).where({ 
          SalesOrder: ReferenceSDDocument 
        })
      );

      if (!salesOrderQuery || !salesOrderQuery.length) {
        console.log("Sales order not found for reference", ReferenceSDDocument);
      }

      const SoldToParty = salesOrderQuery.length ? salesOrderQuery[0].SoldToParty : '';

      let bpTaxNumber = '';
      if (SoldToParty) {
        const bpTaxQuery = await business.run(
          SELECT.from(buss).where({ 
            BusinessPartner: SoldToParty 
          })
        );
        bpTaxNumber = bpTaxQuery.length ? bpTaxQuery[0].BPTaxNumber : '';
      }

      const insLotQuery = await inspect.run(
        SELECT.from(inslot).where({ 
          Batch: Batch,
          Material: Material 
        })
      );
  
      const inspectionLots = await Promise.all(insLotQuery.map(async (lot) => {
        const inspectionLotId = lot.InspectionLot;
        
        const insCharQuery = await inspect.run(
          SELECT.from(inschar).where({ InspectionLot: inspectionLotId })
        );
        
        const insResQuery = await inspect.run(
          SELECT.from(insres).where({ InspectionLot: inspectionLotId })
        );
        
        const inspectionResults = insResQuery.map(res => {
          const characteristic = insCharQuery.find(char => 
            char.InspectionCharacteristic === res.InspectionCharacteristic
          );
      
          return {
            InspectionCharacteristic: characteristic ? characteristic.InspectionCharacteristic : 'N/A',
            InspectionSpecification: characteristic ? characteristic.InspectionSpecification : 'N/A',
            InspectionResultMeanValue: res.InspectionResultMeanValue,
            CharacteristicAttributeCode: res.CharacteristicAttributeCode,
            InspectionResultMaximumValue: res.InspectionResultMaximumValue,
            InspectionResultMinimumValue: res.InspectionResultMinimumValue
          };
        });
      
        return {
          InspectionLot: lot.InspectionLot,
          Material: lot.Material,
          Batch: lot.Batch,
          Quantity: lot.InspectionLotQuantity,
          Date: lot.InspLotCreatedOnLocalDate,
          InspectionLotObjectText: lot.InspectionLotObjectText,
          SalesOrder: lot.SalesOrder || '',
          SalesOrderItem: lot.SalesOrderItem || '0',
          InspectionResults: inspectionResults
        };
      }));
  
      const obAddrQuery = await outbound.run(
        SELECT.from(obaddr).where({ DeliveryDocument: outboundId })
      );
  
      const structuredData = {
        QualityCertificate: {
          CertificateNumber: post[0].certno,
          OutboundAddress: {
            ...obAddrQuery.length ? obAddrQuery[0] : {},
            BPTaxNumber: bpTaxNumber,
            SoldToParty: SoldToParty,
            ReferenceSDDocument: ReferenceSDDocument
          },
          InspectionLots: inspectionLots.length ? inspectionLots : [],
        }
      };
  
      function ensureEmptyTags(obj) {
        if (Array.isArray(obj)) {
          return obj.length === 0 ? {} : obj.map(ensureEmptyTags);
        } else if (typeof obj === 'object' && obj !== null) {
          return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, ensureEmptyTags(value)])
          );
        }
        return obj;
      }

      // let labelname = req.data.labelname;
      // if (!labelname) {
      //   labelname = "quality/Certificate";
      // }
      
      const updatedJsonData = ensureEmptyTags(structuredData);
      const xml = create(updatedJsonData).end({ prettyPrint: true });
      console.log("Generated XML:", xml);
      const base64Xml = Buffer.from(xml).toString('base64');

      try {
        const authResponse = await axios.get('https://chembonddev.authentication.us10.hana.ondemand.com/oauth/token', {
          params: {
            grant_type: 'client_credentials'
          },
          auth: {
            username: 'sb-ffaa3ab1-4f00-428b-be0a-1ec55011116b!b142994|ads-xsappname!b65488',
            password: 'e44adb92-4284-4c5f-8d41-66f8c1125bc5$F4bN1ypCgWzc8CsnjwOfT157HCu5WL0JVwHuiuwHcSc='
          }
        });
        
        const accessToken = authResponse.data.access_token;

        const pdfResponse = await axios.post('https://adsrestapi-formsprocessing.cfapps.us10.hana.ondemand.com/v1/adsRender/pdf?templateSource=storageName', {
          xdpTemplate: "Quality_Certificate/Default",
          xmlData: base64Xml,
          formType: "print",
          formLocale: "",
          taggedPdf: 1,
          embedFont: 0
        }, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const fileContent = pdfResponse.data.fileContent;
        return fileContent;
      } catch (error) {
        console.error("Error occurred during PDF generation:", error);
        console.log("Returning XML as fallback");
        return xml;
      }
    } catch (error) {
      console.error("Error generating certificate data:", error);
      return req.error(500, `Error generating form: ${error.message}`);
    }
  });
});





// const cds = require("@sap/cds");
// const { create } = require('xmlbuilder2');
// const axios = require('axios');

// module.exports = cds.service.impl(async function () {
//   const inspect = await cds.connect.to("API_INSPECTIONLOT_SRV");
//   const outbound = await cds.connect.to("API_OUTBOUND_DELIVERY_SRV_0002");
//   const sales = await cds.connect.to("API_SALES_ORDER_SRV");
//   const business = await cds.connect.to("API_BUSINESS_PARTNER");

//   this.on('READ', 'inslot', async (req) => {
//     try {
//       return await inspect.run(req.query);
//     } catch (error) {
//       console.error('Error reading inspection lot:', error);
//       return req.error(500, `Error reading inspection lot: ${error.message}`);
//     }
//   });

//   this.on('READ', 'inschar', async (req) => {
//     try {
//       return await inspect.run(req.query);
//     } catch (error) {
//       console.error('Error reading inspection characteristics:', error);
//       return req.error(500, `Error reading inspection characteristics: ${error.message}`);
//     }
//   });

//   this.on('READ', 'insres', async (req) => {
//     try {
//       return await inspect.run(req.query);
//     } catch (error) {
//       console.error('Error reading inspection results:', error);
//       return req.error(500, `Error reading inspection results: ${error.message}`);
//     }
//   });

//   this.on('READ', 'obitem', async (req) => {
//     try {
//       return await outbound.run(req.query);
//     } catch (error) {
//       console.error('Error reading outbound item:', error);
//       return req.error(500, `Error reading outbound item: ${error.message}`);
//     }
//   });

//   this.on('READ', 'obaddr', async (req) => {
//     try {
//       return await outbound.run(req.query);
//     } catch (error) {
//       console.error('Error reading outbound address:', error);
//       return req.error(500, `Error reading outbound address: ${error.message}`);
//     }
//   });


//   const { obitem, inslot, obaddr, insres, inschar, salesodr, buss } = this.entities;

//   this.before('CREATE', 'quality1', async req => {
//     try {
//       const nquery = SELECT.from('com.satinfotech.quality.numberrange')
//         .where({ object_name: 'outboundqc' });
      
//       const res = await cds.run(nquery);
      
//       if (!res || res.length === 0) {
//         return req.error({ 
//           code: 'NOOUTBNUM', 
//           message: 'Outbound Number Not Set, Please set the Number Range' 
//         });
//       }

//       const currentNum = res[0].current_num;
//       const fromNum = res[0].from_num;
//       const toNum = res[0].to_num;
//       const new_num = currentNum ? Number(currentNum) + 1 : Number(fromNum) + 1;

//       if (new_num > toNum) {
//         return req.error({
//           code: 'NUMRANGE_EXCEEDED',
//           message: 'Number range limit exceeded. Please update the number range.'
//         });
//       }

//       await cds.run(
//         UPDATE('com.satinfotech.quality.numberrange')
//           .set({ current_num: new_num })
//           .where({ object_name: 'outboundqc' })
//       );

//       req.data.certno = String(new_num).padStart(10, '0');
//     } catch (error) {
//       console.error('Error generating certificate number:', error);
//       return req.error(500, `Error generating certificate number: ${error.message}`);
//     }
//   });

//   this.on('printForm', 'quality1', async (req) => {
//     try {
//       const out_ids = req.params[0]?.ID;
//       if (!out_ids) {
//         return req.error(400, "Missing ID parameter");
//       }
  
//       const post = await cds.run(SELECT.from('com.satinfotech.quality.quality1').where({ ID: out_ids }));
//       if (!post || post.length === 0) {
//         return req.error(404, "Quality record not found");
//       }
  
//       const outboundId = post[0].outbound;
//       const outboundItem = post[0].outbounditem;
  
//       // Get Outbound Delivery Item
//       const obItemQuery = await outbound.run(
//         SELECT.from(obitem).where({ 
//           DeliveryDocument: outboundId, 
//           DeliveryDocumentItem: outboundItem 
//         })
//       );
  
//       if (!obItemQuery || !obItemQuery.length) {
//         return req.error(404, "Outbound item not found");
//       }
  
//       const { Batch, Material, ReferenceSDDocument } = obItemQuery[0];
      
//       // Get Sales Order details
//       const salesOrderQuery = await sales.run(
//         SELECT.from(salesodr).where({ 
//           SalesOrder: ReferenceSDDocument 
//         })
//       );

//       if (!salesOrderQuery || !salesOrderQuery.length) {
//         return req.error(404, "Sales order not found");
//       }

//       const { SoldToParty } = salesOrderQuery[0];

//       // Get Business Partner Tax Number
//       const bpTaxQuery = await business.run(
//         SELECT.from(buss).where({ 
//           BusinessPartner: SoldToParty 
//         })
//       );

//       const bpTaxNumber = bpTaxQuery.length ? bpTaxQuery[0].BPTaxNumber : '';
  
//       // Get Inspection Lot details
//       const insLotQuery = await inspect.run(
//         SELECT.from(inslot).where({ 
//           Batch: Batch,
//           Material: Material 
//         })
//       );
  
//       const inspectionLots = await Promise.all(insLotQuery.map(async (lot) => {
//         const inspectionLotId = lot.InspectionLot;
        
//         const insCharQuery = await inspect.run(
//           SELECT.from(inschar).where({ InspectionLot: inspectionLotId })
//         );
        
//         const insResQuery = await inspect.run(
//           SELECT.from(insres).where({ InspectionLot: inspectionLotId })
//         );
        
//         const inspectionResults = insResQuery.map(res => {
//           const characteristic = insCharQuery.find(char => 
//             char.InspectionCharacteristic === res.InspectionCharacteristic
//           );
      
//           return {
//             InspectionCharacteristic: characteristic ? characteristic.InspectionCharacteristic : 'N/A',
//             InspectionSpecification: characteristic ? characteristic.InspectionSpecification : 'N/A',
//             InspectionResultMeanValue: res.InspectionResultMeanValue,
//             CharacteristicAttributeCode: res.CharacteristicAttributeCode,
//             InspectionResultMaximumValue: res.InspectionResultMaximumValue,
//             InspectionResultMinimumValue: res.InspectionResultMinimumValue
//           };
//         });
      
//         return {
//           InspectionLot: lot.InspectionLot,
//           Material: lot.Material,
//           Batch: lot.Batch,
//           Quantity: lot.InspectionLotQuantity,
//           Date: lot.InspLotCreatedOnLocalDate,
//           InspectionLotObjectText: lot.InspectionLotObjectText,
//           SalesOrder: lot.SalesOrder || '',
//           SalesOrderItem: lot.SalesOrderItem || '0',
//           InspectionResults: inspectionResults
//         };
//       }));
  
//       const obAddrQuery = await outbound.run(
//         SELECT.from(obaddr).where({ DeliveryDocument: outboundId })
//       );
  
//       const structuredData = {
//         QualityCertificate: {
//           CertificateNumber: post[0].certno,
//           OutboundAddress: {
//             ...obAddrQuery.length ? obAddrQuery[0] : {},
//             BPTaxNumber: bpTaxNumber,
//             SoldToParty: SoldToParty,
//             ReferenceSDDocument: ReferenceSDDocument
//           },
//           InspectionLots: inspectionLots.length ? inspectionLots : [],
//         }
//       };
  
//       const xmlOutput = create(structuredData).end({ prettyPrint: true });
//       console.log("Generated XML:", xmlOutput);
//       return xmlOutput;
  
//     } catch (error) {
//       console.error("Error generating XML:", error);
//       return req.error(500, `Error generating form: ${error.message}`);
//     }
//   });
// });

// /*const cds = require("@sap/cds");
// const { create } = require('xmlbuilder2');

// module.exports = cds.service.impl(async function () {
//   const inspect = await cds.connect.to("API_INSPECTIONLOT_SRV");
//   const outbound = await cds.connect.to("API_OUTBOUND_DELIVERY_SRV_0002");
  
//   this.on('READ', 'inslot', async (req) => {
//     try {
//       return await inspect.run(req.query);
//     } catch (error) {
//       console.error('Error reading inspection lot:', error);
//       return req.error(500, `Error reading inspection lot: ${error.message}`);
//     }
//   });

//   this.on('READ', 'inschar', async (req) => {
//     try {
//       return await inspect.run(req.query);
//     } catch (error) {
//       console.error('Error reading inspection characteristics:', error);
//       return req.error(500, `Error reading inspection characteristics: ${error.message}`);
//     }
//   });

//   this.on('READ', 'insres', async (req) => {
//     try {
//       return await inspect.run(req.query);
//     } catch (error) {
//       console.error('Error reading inspection results:', error);
//       return req.error(500, `Error reading inspection results: ${error.message}`);
//     }
//   });

//   this.on('READ', 'obitem', async (req) => {
//     try {
//       return await outbound.run(req.query);
//     } catch (error) {
//       console.error('Error reading outbound item:', error);
//       return req.error(500, `Error reading outbound item: ${error.message}`);
//     }
//   });

//   this.on('READ', 'obaddr', async (req) => {
//     try {
//       return await outbound.run(req.query);
//     } catch (error) {
//       console.error('Error reading outbound address:', error);
//       return req.error(500, `Error reading outbound address: ${error.message}`);
//     }
//   });

//   const { obitem, inslot, obaddr, insres, inschar   } = this.entities;

//   this.before('CREATE', 'quality1', async req => {
//     try {
//       const nquery = SELECT.from('com.satinfotech.quality.numberrange')
//         .where({ object_name: 'outboundqc' });
      
//       const res = await cds.run(nquery);
      
//       if (!res || res.length === 0) {
//         return req.error({ 
//           code: 'NOOUTBNUM', 
//           message: 'Outbound Number Not Set, Please set the Number Range' 
//         });
//       }

//       const currentNum = res[0].current_num;
//       const fromNum = res[0].from_num;
//       const toNum = res[0].to_num;
//       const new_num = currentNum ? Number(currentNum) + 1 : Number(fromNum) + 1;

//       if (new_num > toNum) {
//         return req.error({
//           code: 'NUMRANGE_EXCEEDED',
//           message: 'Number range limit exceeded. Please update the number range.'
//         });
//       }

//       await cds.run(
//         UPDATE('com.satinfotech.quality.numberrange')
//           .set({ current_num: new_num })
//           .where({ object_name: 'outboundqc' })
//       );

//       req.data.certno = String(new_num).padStart(10, '0');
//     } catch (error) {
//       console.error('Error generating certificate number:', error);
//       return req.error(500, `Error generating certificate number: ${error.message}`);
//     }
//   });

//   this.on('printForm', 'quality1', async (req) => {
//     try {
//       const out_ids = req.params[0]?.ID;
//       if (!out_ids) {
//         return req.error(400, "Missing ID parameter");
//       }
  
//       const post = await cds.run(SELECT.from('com.satinfotech.quality.quality1').where({ ID: out_ids }));
//       if (!post || post.length === 0) {
//         return req.error(404, "Quality record not found");
//       }
  
//       const outboundId = post[0].outbound;
//       const outboundItem = post[0].outbounditem;
  
//       const obItemQuery = await outbound.run(
//         SELECT.from(obitem).where({ 
//           DeliveryDocument: outboundId, 
//           DeliveryDocumentItem: outboundItem 
//         })
//       );
  
//       if (!obItemQuery || !obItemQuery.length) {
//         return req.error(404, "Outbound item not found");
//       }
  
//       const { Batch, Material } = obItemQuery[0];
//       if (!Batch || !Material) {
//         return req.error(400, "Missing batch or material information in outbound delivery");
//       }
  
//       const insLotQuery = await inspect.run(
//         SELECT.from(inslot).where({ 
//           Batch: Batch,
//           Material: Material 
//         })
//       );
  
//       const inspectionLots = await Promise.all(insLotQuery.map(async (lot) => {
//         const inspectionLotId = lot.InspectionLot;
//         console.log("Processing Inspection Lot ID:", inspectionLotId);
      
//         // Query for Inspection Characteristics (using the updated CDS projection)
//         const insCharQuery = await inspect.run(
//           SELECT.from(inschar).where({ InspectionLot: inspectionLotId })
//         );
//         console.log("Inspection Characteristics:", insCharQuery); // Log for debugging
      
//         // Query for Inspection Results (from the existing `insres` projection)
//         const insResQuery = await inspect.run(
//           SELECT.from(insres).where({ InspectionLot: inspectionLotId })
//         );
//         console.log("Inspection Results:", insResQuery); // Log for debugging
      
//         // Map the Inspection Results including characteristics and specifications
//         const inspectionResults = insResQuery.map(res => {
//           const characteristic = insCharQuery.find(char => char.InspectionCharacteristic === res.InspectionCharacteristic);
      
//           return {
//             InspectionCharacteristic: characteristic ? characteristic.InspectionCharacteristic : 'N/A',
//             InspectionSpecification: characteristic ? characteristic.InspectionSpecification : 'N/A',
//             InspectionResultMeanValue: res.InspectionResultMeanValue,
//             CharacteristicAttributeCode: res.CharacteristicAttributeCode,
//             InspectionResultMaximumValue: res.InspectionResultMaximumValue,
//             InspectionResultMinimumValue: res.InspectionResultMinimumValue
//           };
//         });
      
//         return {
//           InspectionLot: lot.InspectionLot,
//           Material: lot.Material,
//           Batch: lot.Batch,
//           Quantity: lot.InspectionLotQuantity,
//           Date: lot.InspLotCreatedOnLocalDate,
//           InspectionLotObjectText: lot.InspectionLotObjectText,
//           SalesOrder: lot.SalesOrder || '',
//           SalesOrderItem: lot.SalesOrderItem || '0',
//           InspectionResults: inspectionResults
//         };
//       }));
  
//       const obAddrQuery = await outbound.run(
//         SELECT.from(obaddr).where({ DeliveryDocument: outboundId })
//       );
  
//       const structuredData = {
//         QualityCertificate: {
//           CertificateNumber: post[0].certno,
//           OutboundAddress: obAddrQuery.length ? obAddrQuery[0] : {},
//           InspectionLots: inspectionLots.length ? inspectionLots : [],
//         }
//       };
  
//       // Helper function to convert structured data to XML
//       function buildXml(data) {
//         const xml = create(data).end({ prettyPrint: true });
//         return xml;
//       }
  
//       const xmlOutput = buildXml(structuredData);
//       console.log("Generated XML:", xmlOutput);
//       return xmlOutput;
  
//     } catch (error) {
//       console.error("Error generating XML:", error);
//       return req.error(500, `Error generating form: ${error.message}`);
//     }
//   });
// });
// */