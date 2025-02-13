namespace com.satinfotech.quality;
using {managed,cuid} from '@sap/cds/common';

entity quality1 : cuid,managed{ 
    @title: 'TC Number'
    certno: String(10) @readonly;
    @title: 'Delivery Number'
    outbound: String(10);
    @title: 'Delivery Number Item'
    outbounditem: String(6);
}

entity numberrange: managed, cuid {
    @title: 'Object name'
    object_name: String(20);
    @title: 'Length of the Number'
    len_num: Integer;
    @title: 'Start Number'
    from_num: Integer64;
    @title: 'End Number'
    to_num: Integer64;
    @title: 'Current Number'
    current_num: Integer64 @readonly;
}
