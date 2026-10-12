const conditionNames = ['path-ahead', 'path-left', 'path-right'] as const;

type ConditionName = (typeof conditionNames)[number];

export { conditionNames };
export type { ConditionName };
