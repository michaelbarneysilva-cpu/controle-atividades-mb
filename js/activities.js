export const ACTIVITY_CLASSIFICATIONS = {
  completed_full: 'Concluída totalmente',
  completed_partial: 'Concluída parcialmente',
  minimum_done: 'Executada no mínimo',
  rescheduled: 'Remarcada',
  not_done: 'Não realizada',
};

export function createActivity(description) {
  if (description.trim() === '') {
    return null;
  }
  return {
    id: crypto.randomUUID(),
    description,
    createdAt: new Date().toISOString(),
    status: 'pending',
    completedAt: null,
    classification: null,
    note: '',
  };
}

export function completeActivity(activity, classificationKey, note) {
  if (!(classificationKey in ACTIVITY_CLASSIFICATIONS)) {
    throw new Error('invalid classification');
  }
  return {
    ...activity,
    status: 'done',
    completedAt: new Date().toISOString(),
    classification: classificationKey,
    note: note ?? activity.note,
  };
}

export function reopenActivity(activity) {
  return {
    ...activity,
    status: 'pending',
    completedAt: null,
    classification: null,
  };
}

export function updateActivityNote(activity, note) {
  return { ...activity, note };
}
