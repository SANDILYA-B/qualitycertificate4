using {com.satinfotech.quality as quality} from '../db/schema';

using { API_INSPECTIONLOT_SRV as inspect } from './external/API_INSPECTIONLOT_SRV';
using { API_OUTBOUND_DELIVERY_SRV_0002 as outbound } from './external/API_OUTBOUND_DELIVERY_SRV_0002';
using { API_SALES_ORDER_SRV as sales } from './external/API_SALES_ORDER_SRV';
using { API_BUSINESS_PARTNER as business } from './external/API_BUSINESS_PARTNER';

service qualitycertificate {
     entity inslot as projection on inspect.A_InspectionLot {
          key InspectionLot,
          InspectionLotObjectText,
          SalesOrder,
          SalesOrderItem,
          Material,
          Batch,
          InspectionLotQuantity,
          InspLotCreatedOnLocalDate
     } 

    entity inschar as projection on inspect.A_InspectionCharacteristic {
          key InspectionLot,
          InspectionCharacteristic,
          InspectionSpecification,
          
     }

     entity insres as projection on inspect.A_InspectionResult {
          key InspectionLot,
          InspectionCharacteristic,
          InspectionResultMeanValue,
          InspectionResultMinimumValue,
          InspectionResultMaximumValue,
          CharacteristicAttributeCode,
     }
 

     entity obitem as projection on outbound.A_OutbDeliveryItem {
          key DeliveryDocument,
          key DeliveryDocumentItem,
          ReferenceSDDocument,
          ReferenceSDDocumentItem,
          Material,
          Batch
     }  

     entity obaddr as projection on outbound.A_OutbDeliveryAddress2 {
          key DeliveryDocument,
          key BusinessPartnerName1,
          StreetName,
          CityName,
          Region,
          Country,
          PostalCode
     } 
     entity salesodr as projection on sales.A_SalesOrder {
        key SalesOrder,
        SoldToParty
     } 
      
     entity buss as projection on business.A_BusinessPartnerTaxNumber {
        key BusinessPartner,
        BPTaxNumber
     } 



    entity quality1 as projection on quality.quality1{
        *
    }actions{
        action printForm() returns String
    };

    entity NumberRange as projection on quality.numberrange;
};


annotate qualitycertificate.quality1 with @odata.draft.enabled;
annotate qualitycertificate.NumberRange with @odata.draft.enabled;
    
   annotate qualitycertificate.quality1 with @(
        
        UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: certno
        },
        {
            $Type: 'UI.DataField',
            Value: outbound
        },
        {
            $Type: 'UI.DataField',
            Value: outbounditem
        },

    ],
    UI.SelectionFields: [ outbound, outbounditem ]
    );

    annotate qualitycertificate.quality1 with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : certno,
            },
            {
                $Type : 'UI.DataField',
                Value : outbound,
            },
            {
                $Type : 'UI.DataField',
                Value : outbounditem,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ]
);

annotate quality.quality1 with {
    outbound @(Common.ValueList: {
        Label         : 'Purchase Order Items',
        CollectionPath: 'obitem',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: 'outbound',
                ValueListProperty: 'DeliveryDocument'
            },
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: 'outbounditem',
                ValueListProperty: 'DeliveryDocumentItem'
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'Material'
            },

        ]
    });
}
 