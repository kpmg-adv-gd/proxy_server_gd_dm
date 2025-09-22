
const updateZSpecialGroupsQuery = `UPDATE z_special_groups
                                SET elaborated = $1
                                WHERE plant=$2 and project = $3 and wbe = $4 and "order" = $5 and elaborated != $1 `;

const getZSpecialGroupsNotElbaoratedByWBSQuery = `SELECT DISTINCT zsg.*,zol.parent_order,zol.parent_material,zol.child_material  
                                                FROM z_special_groups zsg
                                                inner join z_orders_link zol on zol.child_order = zsg."order" and zol.plant = zsg.plant and zol.project  = zsg.project 
                                                WHERE zsg.project = ANY($1) and zsg.elaborated = 'false'  `;

const upsertZReportMancantiQuery =  `INSERT INTO z_report_mancanti (
                                        plant,
                                        project,
                                        wbs_element,
                                        "order",
                                        material,
                                        missing_material,
                                        missing_quantity,
                                        receipt_expected_date,
                                        first_conf_date,
                                        mrp_date,
                                        date_from_workshop,
                                        cover_element,
                                        storage_location,
                                        component_order,
                                        active
                                    ) VALUES (
                                        $1,  -- plant
                                        $2,  -- project
                                        $3,  -- wbs_element
                                        $4,  -- order
                                        $5,  -- material
                                        $6,  -- missing_material
                                        $7,  -- missing_quantity
                                        $8,  -- receipt_expected_date
                                        $9,  -- first_conf_date
                                        $10, -- mrp_date
                                        $11, -- date_from_workshop
                                        $12, -- cover_element
                                        $13, -- storage_location
                                        $14, -- component_order
                                        $15  -- active
                                    )
                                    ON CONFLICT (plant,project,wbs_element,"order",material,missing_material)
                                    DO UPDATE SET
                                        project = EXCLUDED.project,
                                        wbs_element = EXCLUDED.wbs_element,
                                        material = EXCLUDED.material,
                                        missing_quantity = EXCLUDED.missing_quantity,
                                        receipt_expected_date = EXCLUDED.receipt_expected_date,
                                        first_conf_date = EXCLUDED.first_conf_date,
                                        mrp_date = EXCLUDED.mrp_date,
                                        date_from_workshop = EXCLUDED.date_from_workshop,
                                        cover_element = EXCLUDED.cover_element,
                                        storage_location = EXCLUDED.storage_location,
                                        component_order = EXCLUDED.component_order,
                                        active = EXCLUDED.active;
                                    `;

const getZMancantiReportDataQuery = `WITH MANCANTI_REPORT as ( SELECT 
                                    plant,
                                    project,
                                    wbs_element,
                                    "order",
                                    material,
                                    missing_material,
                                    cast(missing_quantity as integer),
                                    CASE 
	                                    WHEN cover_element IN (
											'RECEIVING STOCK', 'PRJ STOCK', 'STOCK', 'STO'
                                        ) THEN (
                                            CASE 
                                                WHEN storage_location IN ('PLT5') THEN 'IN ATTESA DI PRELIEVO'
                                                ELSE 'CARICATO MA NON PRELEVABILE'
                                            END
                                        )
                                        WHEN cover_element IN (
											'INSPECTED STOCK', 'PRJ STOCK INSP'
                                        ) THEN (
                                            CASE 
                                                WHEN storage_location IN ('RCP2','RCP5') THEN 'RICEVUTO IN ATTESA DI CARICO'
                                                WHEN storage_location IN ('RCP1') or  storage_location like 'QI%' THEN 'COLLAUDO PEZZI'
                                                ELSE ''
                                            END
                                        )
                                        WHEN cover_element IN ('PURCHASE REQUISITION', 'PURCHASE ORDER', 'PURCHASE ORDER SUBCO', 'PLANNED ORDER', 'PROD') THEN 'PRODUTTIVO'
                                        ELSE ''
                                    END AS type_mancante,
                                    cover_element as type_cover_element,
                                    case when cover_element IN ( --Ordine di Acuisto
                                            'PURCHASE REQUISITION', 'PURCHASE ORDER','PURCHASE ORDER SUBCO'
                                        ) then (case when receipt_expected_date is not null then TO_CHAR(receipt_expected_date, 'DD/MM/YYYY')
                                                when first_conf_date is not null then TO_CHAR(first_conf_date, 'DD/MM/YYYY')
                                                when mrp_date is not null then TO_CHAR(mrp_date, 'DD/MM/YYYY')
                                                else NULL
                                                end)
                                        when cover_element IN ( --Ordine Produttivo
                                            'PROD', 'PLANNED ORDER'
                                        ) then (case when date_from_workshop is not null then TO_CHAR(date_from_workshop, 'DD/MM/YYYY')
                                                when mrp_date is not null then TO_CHAR(mrp_date, 'DD/MM/YYYY')
                                                else NULL
                                                end)
                                    end as delivery_date,
                                    cover_element,
                                    storage_location,
                                    component_order,
                                    receipt_expected_date,
                                    first_conf_date,
                                    mrp_date,
                                    date_from_workshop,
                                    active
                                FROM z_report_mancanti
                                WHERE active = true
                                ) 
                                select mr.* ,zol.parent_material,TO_DATE(mr.delivery_date, 'DD/MM/YYYY') AS delivery_date_sort
                                from MANCANTI_REPORT mr
                                left join z_orders_link zol ON zol.child_order = mr."order" and zol.plant =  $1
                                WHERE mr.plant = $1 `;

const getMancantiInfoDataQuery = `select plant,project,"order",count(*) as tot_mancanti
                                    from z_report_mancanti
                                    where active = true and plant = $1 and project = $2 and "order" = $3
                                    group by plant,project,"order"
                                `;


module.exports = { updateZSpecialGroupsQuery, getZSpecialGroupsNotElbaoratedByWBSQuery, upsertZReportMancantiQuery, getZMancantiReportDataQuery, getMancantiInfoDataQuery };