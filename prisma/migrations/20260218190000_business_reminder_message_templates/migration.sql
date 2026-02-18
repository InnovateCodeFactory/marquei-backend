-- AlterTable
ALTER TABLE "BusinessReminderSettings"
ADD COLUMN "reminder_template" TEXT NOT NULL DEFAULT 'Lembrete: você tem um agendamento de {{service_name}} com {{professional_name}} {{day_with_preposition}} às {{time}}.{{signup_hint}}{{app_download_links}}',
ADD COLUMN "confirmation_request_template" TEXT NOT NULL DEFAULT '*{{business_name}}*\n\nOlá! Tudo bem? 😊\n\nO profissional {{professional_name}} solicita a confirmação do seu agendamento de *{{service_name}}* para {{day_with_preposition}}, às {{time}}.\n\n{{confirmation_action}}{{signup_hint}}';
