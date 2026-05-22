export class SigeuUser {
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.username = data.username || '';
    this.role = data.role || 'CITIZEN';
    this.name = data.name || data.fullName || '';
  }

  static fromApi(data) {
    if (!data) return null;
    return data instanceof SigeuUser ? data : new SigeuUser(data);
  }

  static fromStorage(storageValue) {
    if (!storageValue) return null;

    try {
      return new SigeuUser(JSON.parse(storageValue));
    } catch {
      localStorage.removeItem('sigeu_user');
      return null;
    }
  }

  static isCitizenRole(role) {
    return role === 'CITIZEN';
  }

  isCitizen() {
    return SigeuUser.isCitizenRole(this.role);
  }

  matchesLoginMode(selectedRole) {
    return this.isCitizen() === SigeuUser.isCitizenRole(selectedRole);
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      role: this.role,
      name: this.name,
    };
  }
}
