import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminSettings, CheckResult, MailSettingsInput } from '../api/models';

/** Server settings of the administration: mail service and public address. */
@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private readonly http = inject(HttpClient);

  settings(): Promise<AdminSettings> {
    return firstValueFrom(this.http.get<AdminSettings>('api/admin/settings'));
  }

  saveGeneral(appUrl: string | null): Promise<AdminSettings> {
    return firstValueFrom(this.http.put<AdminSettings>('api/admin/settings/general', { appUrl }));
  }

  saveMail(mail: MailSettingsInput): Promise<AdminSettings> {
    return firstValueFrom(this.http.put<AdminSettings>('api/admin/settings/mail', mail));
  }

  /** Back to MAILER_DSN of the environment */
  resetMailServer(): Promise<AdminSettings> {
    return firstValueFrom(this.http.delete<AdminSettings>('api/admin/settings/mail/server'));
  }

  /** Tests the values of the form, saved or not */
  testMail(mail: MailSettingsInput, recipient: string | null): Promise<CheckResult> {
    return firstValueFrom(this.http.post<CheckResult>('api/admin/mail/test', { ...mail, recipient }));
  }
}
