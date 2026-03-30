alter table todos
  add column recurrence text
    check (recurrence in ('daily', 'weekly', 'monthly'));
