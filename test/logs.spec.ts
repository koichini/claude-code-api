import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// Mock D1 Database
const createMockDB = () => {
  const data = new Map();
  let nextId = 1;

  const mockPrepare = (query: string) => {
    return {
      bind: (...values: any[]) => ({
        first: async () => {
          if (query.includes('SELECT * FROM Logs WHERE id = ?')) {
            const id = values[0];
            return data.get(parseInt(id)) || null;
          }
          if (query.includes('SELECT id FROM Logs WHERE id = ?')) {
            const id = values[0];
            return data.has(parseInt(id)) ? { id: parseInt(id) } : null;
          }
          if (query.includes('INSERT INTO Logs')) {
            const [command, message] = values;
            const log = {
              id: nextId++,
              command,
              message,
              created: new Date().toISOString()
            };
            data.set(log.id, log);
            return log;
          }
          return null;
        },
        all: async () => {
          if (query.includes('SELECT * FROM Logs ORDER BY created DESC')) {
            const results = Array.from(data.values()).sort((a, b) => 
              new Date(b.created).getTime() - new Date(a.created).getTime()
            );
            return { results };
          }
          return { results: [] };
        },
        run: async () => {
          if (query.includes('INSERT INTO Logs')) {
            const [command, message] = values;
            const log = {
              id: nextId++,
              command,
              message,
              created: new Date().toISOString()
            };
            data.set(log.id, log);
            return { success: true };
          }
          if (query.includes('UPDATE Logs SET')) {
            const idIndex = values.length - 1;
            const id = values[idIndex];
            const existing = data.get(parseInt(id));
            if (existing) {
              const updates: any = {};
              if (query.includes('command = ?')) {
                updates.command = values[0];
              }
              if (query.includes('message = ?')) {
                updates.message = values[query.includes('command = ?') ? 1 : 0];
              }
              data.set(parseInt(id), { ...existing, ...updates });
            }
            return { success: true };
          }
          return { success: true };
        }
      }),
      first: async () => {
        if (query.includes('SELECT * FROM Logs WHERE id = ?')) {
          return null;
        }
        return null;
      },
      all: async () => {
        if (query.includes('SELECT * FROM Logs ORDER BY created DESC')) {
          const results = Array.from(data.values()).sort((a, b) => 
            new Date(b.created).getTime() - new Date(a.created).getTime()
          );
          return { results };
        }
        return { results: [] };
      },
      run: async () => ({ success: true })
    };
  };

  return { prepare: mockPrepare };
};

describe('Logs API', () => {
  let mockEnv: any;

  beforeEach(() => {
    // Reset mock database before each test
    mockEnv = {
      DB: createMockDB()
    };
  });

  describe('POST /logs', () => {
    it('creates a new log entry', async () => {
      const requestBody = {
        command: 'ls -la',
        message: 'List directory contents'
      };

      const request = new IncomingRequest('http://example.com/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.log).toMatchObject({
        command: 'ls -la',
        message: 'List directory contents'
      });
      expect(data.log.id).toBeDefined();
      expect(data.log.created).toBeDefined();
    });

    it('returns 400 when command is missing', async () => {
      const requestBody = { message: 'Test message' };

      const request = new IncomingRequest('http://example.com/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('command and message are required');
    });
  });

  describe('GET /logs', () => {
    it('returns all logs', async () => {
      // Insert test data (first entry will be older)
      await mockEnv.DB.prepare('INSERT INTO Logs (command, message) VALUES (?, ?)').bind('pwd', 'Print working directory').run();
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      await mockEnv.DB.prepare('INSERT INTO Logs (command, message) VALUES (?, ?)').bind('ls', 'List files').run();

      const request = new IncomingRequest('http://example.com/logs');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.logs).toHaveLength(2);
      expect(data.logs[0].command).toBe('ls'); // Should be ordered by created DESC (most recent first)
      expect(data.logs[1].command).toBe('pwd');
    });
  });

  describe('GET /logs/:id', () => {
    it('returns a specific log by id', async () => {
      const result = await mockEnv.DB.prepare('INSERT INTO Logs (command, message) VALUES (?, ?) RETURNING *').bind('pwd', 'Print working directory').first();
      const logId = result.id;

      const request = new IncomingRequest(`http://example.com/logs/${logId}`);
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.log.id).toBe(logId);
      expect(data.log.command).toBe('pwd');
      expect(data.log.message).toBe('Print working directory');
    });

    it('returns 404 when log does not exist', async () => {
      const request = new IncomingRequest('http://example.com/logs/999');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Log not found');
    });
  });

  describe('PUT /logs/:id', () => {
    it('updates an existing log', async () => {
      const result = await mockEnv.DB.prepare('INSERT INTO Logs (command, message) VALUES (?, ?) RETURNING *').bind('pwd', 'Print working directory').first();
      const logId = result.id;

      const updateBody = {
        command: 'pwd -P',
        message: 'Print physical working directory'
      };

      const request = new IncomingRequest(`http://example.com/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.log.id).toBe(logId);
      expect(data.log.command).toBe('pwd -P');
      expect(data.log.message).toBe('Print physical working directory');
    });

    it('updates only provided fields', async () => {
      const result = await mockEnv.DB.prepare('INSERT INTO Logs (command, message) VALUES (?, ?) RETURNING *').bind('pwd', 'Print working directory').first();
      const logId = result.id;

      const updateBody = { command: 'pwd -P' };

      const request = new IncomingRequest(`http://example.com/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.log.command).toBe('pwd -P');
      expect(data.log.message).toBe('Print working directory'); // Should remain unchanged
    });

    it('returns 404 when log does not exist', async () => {
      const updateBody = { command: 'test' };

      const request = new IncomingRequest('http://example.com/logs/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Log not found');
    });

    it('returns 400 when no fields provided', async () => {
      const result = await mockEnv.DB.prepare('INSERT INTO Logs (command, message) VALUES (?, ?) RETURNING *').bind('pwd', 'Print working directory').first();
      const logId = result.id;

      const request = new IncomingRequest(`http://example.com/logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('At least command or message is required');
    });
  });
});