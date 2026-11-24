import { useEffect, useState } from 'react';
import type { Entity } from '../domain/types';
import { useAuth } from '../auth/AuthContext';
import type { Repository } from './repositories';

/** All items of a collection owned by the signed-in user, kept up to date. */
export function useCollection<T extends Entity>(repo: Repository<T>): T[] {
  const { user } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () => repo.list(user.id).then((r) => active && setItems(r));
    load();
    const unsubscribe = repo.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repo, user]);
  return items;
}
