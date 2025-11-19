export type Role = 'admin' | 'manager';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}
