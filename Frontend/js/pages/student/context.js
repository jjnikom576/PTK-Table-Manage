import * as globalContext from '../../context/globalContext.js';

export function resolveContext(inputContext) {
  return inputContext || globalContext.getContext();
}

export function resolveSemesterId(context) {
  return (
    context.currentSemester?.id ||
    context.semester?.id ||
    context.semesterId ||
    null
  );
}
