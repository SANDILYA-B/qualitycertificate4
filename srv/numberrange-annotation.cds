using {qualitycertificate} from './qual';


annotate qualitycertificate.NumberRange with @(
     UI.PresentationVariant :{
        SortOrder : [
            {
                Property : object_name,
                Descending : true,
            },
        ],
        Visualizations : [ 
            '@UI.LineItem',
        ],
    },
    UI.LineItem:[
        {
            $Type: 'UI.DataField',
            Value:object_name
        },
        {
            $Type: 'UI.DataField',
            Value: len_num
        },
        {
            $Type: 'UI.DataField',
            Value: current_num
        },
        
        
    ]
);


annotate qualitycertificate.NumberRange with @(
    UI.FieldGroup #NumberRange : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : object_name,
            },
            {
                $Type : 'UI.DataField',
                Value : len_num,
            },
            {
                $Type : 'UI.DataField',
                Value : from_num,
            },
            {
                $Type : 'UI.DataField',
                Value : to_num,
            },
            {
                $Type : 'UI.DataField',
                Value : current_num,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#NumberRange',
        },
    ],
    
);

