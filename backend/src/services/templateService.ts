import { prisma } from '../db/client';
import { TriggerType, MessageChannel } from '@prisma/client';

interface TemplateVariables {
  clientName?: string;
  clientPhone?: string;
  carLicensePlate?: string;
  carVin?: string;
  carMake?: string;
  carModel?: string;
  currentMileage?: number;
  lastServiceDate?: Date | string;
  scheduledFor?: Date | string;
  garageName?: string;
  [key: string]: any;
}

interface RenderResult {
  rendered: string;
  missingVariables: string[];
}

const DEFAULT_TEMPLATES = [
  {
    templateKey: 'retention_service_due_time_sms',
    triggerType: 'SERVICE_DUE_TIME' as TriggerType,
    channel: 'SMS' as MessageChannel,
    name: 'Revizie recomandată (timp)',
    body: 'Salut {{clientName}}! A trecut ceva timp de la ultima revizie pentru {{carLicensePlate}}. Vrei să programăm o verificare? Răspunde cu o zi/ora sau sună-ne. {{garageName}}',
  },
  {
    templateKey: 'retention_service_due_mileage_sms',
    triggerType: 'SERVICE_DUE_MILEAGE' as TriggerType,
    channel: 'SMS' as MessageChannel,
    name: 'Revizie recomandată (km)',
    body: 'Salut {{clientName}}! Pentru {{carLicensePlate}} se apropie următoarea revizie (km). Dacă dorești, te putem programa. {{garageName}}',
  },
  {
    templateKey: 'retention_inactivity_sms',
    triggerType: 'INACTIVITY' as TriggerType,
    channel: 'SMS' as MessageChannel,
    name: 'Revenire client',
    body: 'Salut {{clientName}}! Nu ne-am mai văzut de ceva vreme. Dacă ai nevoie de o verificare pentru {{carLicensePlate}}, te putem programa rapid. {{garageName}}',
  },
  {
    templateKey: 'retention_birthday_sms',
    triggerType: 'BIRTHDAY' as TriggerType,
    channel: 'SMS' as MessageChannel,
    name: 'La mulți ani',
    body: 'La mulți ani, {{clientName}}! Îți dorim o zi frumoasă. Dacă ai nevoie de ceva pentru {{carLicensePlate}}, suntem aici. {{garageName}}',
  },
  {
    templateKey: 'retention_follow_up_sms',
    triggerType: 'FOLLOW_UP' as TriggerType,
    channel: 'SMS' as MessageChannel,
    name: 'Follow-up după service',
    body: 'Salut {{clientName}}! Totul e în regulă după intervenția la {{carLicensePlate}}? Dacă apare ceva, scrie-ne oricând. {{garageName}}',
  },
  {
    templateKey: 'retention_appt_reminder_sms',
    triggerType: 'APPT_REMINDER' as TriggerType,
    channel: 'SMS' as MessageChannel,
    name: 'Reminder programare',
    body: 'Reminder: ai programare la {{garageName}} pe {{scheduledFor}} pentru {{carLicensePlate}}. Dacă nu mai poți ajunge, te rugăm anunță-ne.',
  },
  {
    templateKey: 'retention_ready_sms',
    triggerType: 'READY' as TriggerType,
    channel: 'SMS' as MessageChannel,
    name: 'Mașina este gata',
    body: 'Salut {{clientName}}! Mașina {{carLicensePlate}} este gata și poate fi ridicată. {{garageName}}',
  },
  {
    templateKey: 'retention_service_due_time_whatsapp',
    triggerType: 'SERVICE_DUE_TIME' as TriggerType,
    channel: 'WHATSAPP' as MessageChannel,
    name: 'Revizie recomandată (timp) - WhatsApp',
    body: 'Salut, {{clientName}} 👋\nA trecut ceva timp de la ultima revizie pentru {{carLicensePlate}}.\nVrei să te programăm? Răspunde cu ziua/ora preferată.\n— {{garageName}}',
  },
  {
    templateKey: 'retention_ready_whatsapp',
    triggerType: 'READY' as TriggerType,
    channel: 'WHATSAPP' as MessageChannel,
    name: 'Mașina este gata - WhatsApp',
    body: 'Salut, {{clientName}} ✅\nMașina {{carLicensePlate}} este gata și poate fi ridicată.\n— {{garageName}}',
  },
];

const ALLOWED_PLACEHOLDERS = [
  'clientName',
  'clientPhone',
  'carLicensePlate',
  'carVin',
  'carMake',
  'carModel',
  'currentMileage',
  'lastServiceDate',
  'scheduledFor',
  'garageName',
];

export class TemplateService {
  /**
   * Get all templates for a garage with optional filters
   */
  static async getTemplates(
    garageId: string,
    filters?: {
      triggerType?: TriggerType;
      channel?: MessageChannel;
      enabled?: boolean;
    }
  ) {
    const where: any = { garageId };

    if (filters?.triggerType) {
      where.triggerType = filters.triggerType;
    }

    if (filters?.channel) {
      where.channel = filters.channel;
    }

    if (filters?.enabled !== undefined) {
      where.enabled = filters.enabled;
    }

    return prisma.messageTemplate.findMany({
      where,
      orderBy: [{ triggerType: 'asc' }, { channel: 'asc' }],
    });
  }

  /**
   * Get a single template by ID
   */
  static async getTemplate(id: string, garageId: string) {
    return prisma.messageTemplate.findFirst({
      where: { id, garageId },
    });
  }

  /**
   * Get template by key
   */
  static async getTemplateByKey(garageId: string, templateKey: string) {
    return prisma.messageTemplate.findUnique({
      where: {
        garageId_templateKey: {
          garageId,
          templateKey,
        },
      },
    });
  }

  /**
   * Get template by trigger type and channel
   */
  static async getTemplateByTypeAndChannel(
    garageId: string,
    triggerType: TriggerType,
    channel: MessageChannel
  ) {
    return prisma.messageTemplate.findFirst({
      where: {
        garageId,
        triggerType,
        channel,
        enabled: true,
      },
    });
  }

  /**
   * Create a new template
   */
  static async createTemplate(data: {
    garageId: string;
    templateKey: string;
    triggerType: TriggerType;
    channel: MessageChannel;
    name: string;
    body: string;
    enabled?: boolean;
  }) {
    // Validate body length
    if (data.body.length > 2000) {
      throw new Error('Template body cannot exceed 2000 characters');
    }

    return prisma.messageTemplate.create({
      data: {
        garageId: data.garageId,
        templateKey: data.templateKey,
        triggerType: data.triggerType,
        channel: data.channel,
        name: data.name,
        body: data.body,
        enabled: data.enabled ?? true,
      },
    });
  }

  /**
   * Update a template
   */
  static async updateTemplate(
    id: string,
    garageId: string,
    data: {
      name?: string;
      body?: string;
      enabled?: boolean;
    }
  ) {
    // Verify template belongs to garage
    const template = await this.getTemplate(id, garageId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate body length if provided
    if (data.body && data.body.length > 2000) {
      throw new Error('Template body cannot exceed 2000 characters');
    }

    return prisma.messageTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(id: string, garageId: string) {
    // Verify template belongs to garage
    const template = await this.getTemplate(id, garageId);
    if (!template) {
      throw new Error('Template not found');
    }

    return prisma.messageTemplate.delete({
      where: { id },
    });
  }

  /**
   * Render a template with variables
   */
  static renderTemplate(templateBody: string, variables: TemplateVariables): RenderResult {
    const missingVariables: string[] = [];

    // Find all placeholders in the template
    const placeholderRegex = /{{(\w+)}}/g;
    const placeholders = new Set<string>();
    let match;

    while ((match = placeholderRegex.exec(templateBody)) !== null) {
      placeholders.add(match[1]);
    }

    // Render the template
    let rendered = templateBody;

    for (const placeholder of placeholders) {
      const value = variables[placeholder];

      if (value === undefined || value === null) {
        missingVariables.push(placeholder);
        // Keep the placeholder in the rendered text
        continue;
      }

      // Format the value
      let formattedValue: string;

      if (value instanceof Date) {
        formattedValue = value.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        // ISO date string
        formattedValue = value.split('T')[0];
      } else {
        formattedValue = String(value);
      }

      // Replace all occurrences of this placeholder
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      rendered = rendered.replace(regex, formattedValue);
    }

    return {
      rendered,
      missingVariables,
    };
  }

  /**
   * Get list of allowed placeholders
   */
  static getAllowedPlaceholders(): string[] {
    return [...ALLOWED_PLACEHOLDERS];
  }

  /**
   * Get default templates
   */
  static getDefaultTemplates() {
    return DEFAULT_TEMPLATES;
  }

  /**
   * Seed default templates for a garage
   */
  static async seedDefaultTemplates(garageId: string, overwrite: boolean = false) {
    const garage = await prisma.garage.findUnique({
      where: { id: garageId },
    });

    if (!garage) {
      throw new Error('Garage not found');
    }

    const results = {
      created: 0,
      skipped: 0,
      updated: 0,
    };

    for (const template of DEFAULT_TEMPLATES) {
      const existing = await this.getTemplateByKey(garageId, template.templateKey);

      if (existing) {
        if (overwrite) {
          await prisma.messageTemplate.update({
            where: { id: existing.id },
            data: {
              triggerType: template.triggerType,
              channel: template.channel,
              name: template.name,
              body: template.body,
            },
          });
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await this.createTemplate({
          garageId,
          ...template,
        });
        results.created++;
      }
    }

    return results;
  }
}
