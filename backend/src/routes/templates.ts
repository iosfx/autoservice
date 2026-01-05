import { FastifyInstance } from 'fastify';
import { TemplateService } from '../services/templateService';
import { TriggerType, MessageChannel } from '@prisma/client';

export async function templateRoutes(app: FastifyInstance) {
  /**
   * Get all templates for the authenticated garage
   */
  app.get(
    '/templates',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };
        const { triggerType, channel, enabled } = request.query as {
          triggerType?: TriggerType;
          channel?: MessageChannel;
          enabled?: string;
        };

        const templates = await TemplateService.getTemplates(garageId, {
          triggerType,
          channel,
          enabled: enabled !== undefined ? enabled === 'true' : undefined,
        });

        return { templates };
      } catch (error: any) {
        app.log.error(error);
        return reply.code(500).send({
          message: error.message || 'Failed to get templates',
        });
      }
    }
  );

  /**
   * Get a single template by ID
   */
  app.get(
    '/templates/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };
        const { id } = request.params as { id: string };

        const template = await TemplateService.getTemplate(id, garageId);

        if (!template) {
          return reply.code(404).send({ message: 'Template not found' });
        }

        return { template };
      } catch (error: any) {
        app.log.error(error);
        return reply.code(500).send({
          message: error.message || 'Failed to get template',
        });
      }
    }
  );

  /**
   * Create a new template
   */
  app.post(
    '/templates',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };
        const { templateKey, triggerType, channel, name, body, enabled } = request.body as {
          templateKey: string;
          triggerType: TriggerType;
          channel: MessageChannel;
          name: string;
          body: string;
          enabled?: boolean;
        };

        // Validation
        if (!templateKey || !triggerType || !channel || !name || !body) {
          return reply.code(400).send({
            message: 'templateKey, triggerType, channel, name, and body are required',
          });
        }

        const template = await TemplateService.createTemplate({
          garageId,
          templateKey,
          triggerType,
          channel,
          name,
          body,
          enabled,
        });

        return reply.code(201).send({ template });
      } catch (error: any) {
        app.log.error(error);

        // Handle unique constraint violation
        if (error.code === 'P2002') {
          return reply.code(409).send({
            message: 'A template with this key already exists for your garage',
          });
        }

        return reply.code(500).send({
          message: error.message || 'Failed to create template',
        });
      }
    }
  );

  /**
   * Update a template
   */
  app.put(
    '/templates/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };
        const { id } = request.params as { id: string };
        const { name, body, enabled } = request.body as {
          name?: string;
          body?: string;
          enabled?: boolean;
        };

        const template = await TemplateService.updateTemplate(id, garageId, {
          name,
          body,
          enabled,
        });

        return { template };
      } catch (error: any) {
        app.log.error(error);

        if (error.message === 'Template not found') {
          return reply.code(404).send({ message: error.message });
        }

        return reply.code(500).send({
          message: error.message || 'Failed to update template',
        });
      }
    }
  );

  /**
   * Delete a template
   */
  app.delete(
    '/templates/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };
        const { id } = request.params as { id: string };

        await TemplateService.deleteTemplate(id, garageId);

        return { success: true, message: 'Template deleted' };
      } catch (error: any) {
        app.log.error(error);

        if (error.message === 'Template not found') {
          return reply.code(404).send({ message: error.message });
        }

        return reply.code(500).send({
          message: error.message || 'Failed to delete template',
        });
      }
    }
  );

  /**
   * Preview a template rendering
   */
  app.post(
    '/templates/preview',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };
        const { templateKey, body, variables } = request.body as {
          templateKey?: string;
          body?: string;
          variables: Record<string, any>;
        };

        let templateBody: string;

        if (templateKey) {
          // Load template from database
          const template = await TemplateService.getTemplateByKey(garageId, templateKey);

          if (!template) {
            return reply.code(404).send({ message: 'Template not found' });
          }

          templateBody = template.body;
        } else if (body) {
          // Use provided body directly
          templateBody = body;
        } else {
          return reply.code(400).send({
            message: 'Either templateKey or body must be provided',
          });
        }

        const result = TemplateService.renderTemplate(templateBody, variables || {});

        return result;
      } catch (error: any) {
        app.log.error(error);
        return reply.code(500).send({
          message: error.message || 'Failed to preview template',
        });
      }
    }
  );

  /**
   * Seed default templates for the garage
   */
  app.post(
    '/templates/seed-defaults',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const { garageId } = request.user as { garageId: string };
        const { overwrite } = request.body as { overwrite?: boolean };

        const result = await TemplateService.seedDefaultTemplates(garageId, overwrite || false);

        return {
          success: true,
          ...result,
          message: `Created ${result.created} templates, updated ${result.updated}, skipped ${result.skipped}`,
        };
      } catch (error: any) {
        app.log.error(error);
        return reply.code(500).send({
          message: error.message || 'Failed to seed default templates',
        });
      }
    }
  );

  /**
   * Get list of allowed placeholders
   */
  app.get(
    '/templates/placeholders',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const placeholders = TemplateService.getAllowedPlaceholders();

        return { placeholders };
      } catch (error: any) {
        app.log.error(error);
        return reply.code(500).send({
          message: error.message || 'Failed to get placeholders',
        });
      }
    }
  );
}
