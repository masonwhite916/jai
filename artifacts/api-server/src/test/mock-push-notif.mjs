/**
 * Spy mock for pushNotifications helpers, used by the jobs-route integration test.
 *
 * Import getNotifCalls() / resetNotifCalls() from the test to inspect
 * which helpers were called and with what arguments.
 */

const _calls = {
  notifyTechniciansNewJob:    [],
  notifyCustomerJobAccepted:  [],
  notifyCustomerJobCompleted: [],
};

export function getNotifCalls() {
  return {
    notifyTechniciansNewJob:    [..._calls.notifyTechniciansNewJob],
    notifyCustomerJobAccepted:  [..._calls.notifyCustomerJobAccepted],
    notifyCustomerJobCompleted: [..._calls.notifyCustomerJobCompleted],
  };
}

export function resetNotifCalls() {
  _calls.notifyTechniciansNewJob    = [];
  _calls.notifyCustomerJobAccepted  = [];
  _calls.notifyCustomerJobCompleted = [];
}

export async function notifyTechniciansNewJob(opts) {
  _calls.notifyTechniciansNewJob.push(opts);
}

export async function notifyCustomerJobAccepted(opts) {
  _calls.notifyCustomerJobAccepted.push(opts);
}

export async function notifyCustomerJobCompleted(opts) {
  _calls.notifyCustomerJobCompleted.push(opts);
}
