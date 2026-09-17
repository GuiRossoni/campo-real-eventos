import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import { generateToken } from '../../src/modules/auth/auth.utils';
import { loadFallbackDb } from '../../src/config/database';

describe('Events and Enrollments Workflows (Integration)', () => {
  let coordinatorToken: string;
  let participantToken: string;
  const participantId = `part_${Date.now()}`;

  beforeAll(async () => {
    await loadFallbackDb();

    coordinatorToken = generateToken({
      id: 'coord_integ_1',
      name: 'Coordenador Eventos',
      email: 'coord.eventos@camporeal.edu.br',
      role: 'COORDENADOR'
    });

    participantToken = generateToken({
      id: participantId,
      name: 'Participante Evento',
      email: 'participante.evento@camporeal.edu.br',
      role: 'PARTICIPANTE'
    });
  });

  const eventId = `event_test_${Date.now()}`;
  const workshopId = `ws_test_${Date.now()}`;

  it('Coordenador can create a new Event', async () => {
    const res = await request(app)
      .post('/api/db/write-event-save')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        id: eventId,
        name: 'Semana da Engenharia de Software 2026',
        description: 'Evento de tecnologia e computação aplicada.',
        banner: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
        location: 'Auditório Principal Campo Real',
        startDate: '2026-10-15',
        endDate: '2026-10-17',
        startTime: '19:00',
        endTime: '22:30',
        category: 'Tecnologia',
        maxParticipants: 300,
        status: 'PUBLICADO',
        price: 0
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Coordenador can create a Workshop for the Event', async () => {
    const res = await request(app)
      .post('/api/db/write-workshop-save')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        id: workshopId,
        eventId: eventId,
        name: 'Workshop de Cloud e DevOps',
        description: 'Práticas de deploy em produção com Docker e Node.js.',
        instructor: 'Prof. Anderson',
        date: '2026-10-16',
        startTime: '19:30',
        endTime: '21:30',
        maxParticipants: 40,
        price: 0
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Participant can enroll in the created Event and Workshop', async () => {
    const enrollmentId = `enroll_${Date.now()}`;
    const res = await request(app)
      .post('/api/db/write-enrollment-save')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        id: enrollmentId,
        userId: participantId,
        userEmail: 'participante.evento@camporeal.edu.br',
        userName: 'Participante Evento',
        eventId: eventId,
        eventName: 'Semana da Engenharia de Software 2026',
        selectedWorkshops: [workshopId],
        totalValue: 0,
        status: 'APROVADO'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Workshop participant count can be incremented', async () => {
    const res = await request(app)
      .post('/api/db/write-workshop-increment')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({ workshopIds: [workshopId] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Coordenador can register attendance for the Participant', async () => {
    const res = await request(app)
      .post('/api/db/write-attendance-save')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        id: `att_${Date.now()}`,
        userId: participantId,
        userName: 'Participante Evento',
        userEmail: 'participante.evento@camporeal.edu.br',
        eventId: eventId,
        workshopId: workshopId,
        checkedInAt: new Date().toISOString()
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Coordenador can issue Certificate for the Participant', async () => {
    const res = await request(app)
      .post('/api/db/write-certificate-save')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        id: `cert_${Date.now()}`,
        userId: participantId,
        userName: 'Participante Evento',
        eventId: eventId,
        eventName: 'Semana da Engenharia de Software 2026',
        hours: 12,
        hash: `HASH_${Date.now()}`,
        issuedAt: new Date().toISOString(),
        coordinationSignature: 'Prof. Coordenador de Engenharia'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Coordenador can delete the Event and clean up cascades', async () => {
    const res = await request(app)
      .post('/api/db/write-event-delete')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ id: eventId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
