export type Aktivitet = {
id: string;
navn: string;
start: string; // ISO yyyy-mm-dd
slutt: string; // ISO yyyy-mm-dd
varighet?: number;
avhengighet?: string;
ansvarlig?: string;
status?: string;
};
