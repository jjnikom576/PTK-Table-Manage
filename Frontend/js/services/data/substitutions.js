import * as substitutionsAPI from '../../api/substitutions.js';

export async function getSubstitutions() {
  return substitutionsAPI.getSubstitutions();
}

export async function getSubstitutionSchedules() {
  return substitutionsAPI.getSubstitutionSchedules();
}
