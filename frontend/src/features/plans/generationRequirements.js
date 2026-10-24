export function destinationConfirmed(context) {
  return Boolean(context?.finalDestination?.trim())
    && ['user_explicit', 'user_edit'].includes(context?.provenance?.finalDestination?.source);
}
