const postgresdbService = require('../../connection');
const queryMarking = require("./queries");

async function insertZMarkingRecap(plant,project,wbe_machine,operation,mes_order,confirmation_number,planned_labor,uom_planned_labor,marked_labor,uom_marked_labor,remaining_labor,uom_remaining_labor,variance_labor,uom_variance){
    const data = await postgresdbService.executeQuery(queryMarking.insertMarkingRecapQuery, [plant,project, wbe_machine, operation, mes_order, confirmation_number, planned_labor, uom_planned_labor, marked_labor, uom_marked_labor, remaining_labor, uom_remaining_labor, variance_labor, uom_variance]);
    return data;
}

async function getMarkingByConfirmationNumber(confirmationNumber){
    const data = await postgresdbService.executeQuery(queryMarking.getMarkingByConfirmationNumberQuery, [confirmationNumber]);
    return data;
}

async function getMarkingData(wbe_machine, mes_order, operation) {
    const data = await postgresdbService.executeQuery(queryMarking.getMarkingDataQuery, [wbe_machine, mes_order, operation]);
    return data;
}

async function insertOpConfirmation(
    wbe_machine,
    operation,
    mes_order,
    confirmation_number,
    marking_date,
    start_time,
    finish_time,
    marked_labor,
    uom_marked_labor,
    variance_labor,
    uom_variance_labor,
    reason_for_variance,
    user_id
) {
    const data = await postgresdbService.executeQuery(queryMarking.insertOpConfirmationQuery, [wbe_machine, operation, mes_order,
        confirmation_number, marking_date, start_time, finish_time, marked_labor,
        uom_marked_labor, variance_labor, uom_variance_labor, reason_for_variance, user_id]);
    return data;
}

async function mark(confirmation_number) {

    var sumResult, plannedLaborResult;

    try {
        try {
            sumResult = await calculateLabor(confirmation_number);
        } catch (error) {
            let errorMessage = error.message || "Error service calculateLabor";
            throw { status: 500, message: errorMessage };
        }

        const { marked_labor, variance_labor } = sumResult[0];

        try {
            plannedLaborResult = await getPlannedLabor(confirmation_number);
        } catch (error) {
            let errorMessage = error.message || "Error service getPlannedLabor";
            throw { status: 500, message: errorMessage };
        }

        const planned_labor = plannedLaborResult[0].planned_labor;
        const remaining_labor = planned_labor - marked_labor;

        try {
            await updateMarkingRecap(marked_labor, variance_labor, remaining_labor, confirmation_number);
        } catch (error) {
            let errorMessage = error.message || "Error service updateMarkingRecap";
            throw { status: 500, message: errorMessage };
        }
    } catch (error) {
        let errorMessage = error.message || "Error service mark";
        throw { status: 500, message: errorMessage };
    }
}

async function calculateLabor(confirmation_number) {
    const data = await postgresdbService.executeQuery(queryMarking.calculateLaborQuery, [confirmation_number]);
    return data;
}

async function getPlannedLabor(confirmation_number) {
    const data = await postgresdbService.executeQuery(queryMarking.getPlannedLaborQuery, [confirmation_number]);
    return data;
}

async function updateMarkingRecap(marked_labor, variance_labor, remaining_labor, confirmation_number) {
    const data = await postgresdbService.executeQuery(queryMarking.updateMarkingRecapQuery, [marked_labor, variance_labor, remaining_labor, confirmation_number]);
    return data;
}

module.exports = { getMarkingData, insertOpConfirmation, mark, insertZMarkingRecap, getMarkingByConfirmationNumber }