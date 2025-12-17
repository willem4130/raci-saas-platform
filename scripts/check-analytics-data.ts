import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
  // Get TechCorp organization
  const org = await prisma.organization.findFirst({
    where: { name: 'TechCorp Solutions' }
  });

  if (!org) {
    console.log('❌ TechCorp organization not found');
    process.exit(1);
  }

  console.log('✅ Organization:', org.name);
  console.log('   ID:', org.id);

  // Get members
  const members = await prisma.member.findMany({
    where: { organizationId: org.id, status: 'ACTIVE' },
    include: { user: { select: { name: true, email: true } } }
  });
  console.log('\n✅ Active Members:', members.length);
  members.forEach(m => console.log('   -', m.user.name, '(' + m.user.email + ')'));

  // Get matrices
  const matrices = await prisma.matrix.findMany({
    where: {
      project: { organizationId: org.id },
      deletedAt: null
    },
    include: { project: true }
  });
  console.log('\n✅ Matrices:', matrices.length);
  matrices.forEach(m => console.log('   -', m.name));

  // Get tasks
  const tasks = await prisma.task.findMany({
    where: {
      matrix: {
        project: { organizationId: org.id }
      },
      deletedAt: null
    }
  });
  console.log('\n✅ Tasks:', tasks.length);
  const statusCounts = tasks.reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  console.log('   Status breakdown:', JSON.stringify(statusCounts, null, 2));

  // Get assignments
  const assignments = await prisma.assignment.findMany({
    where: {
      matrix: {
        project: { organizationId: org.id }
      },
      deletedAt: null
    }
  });
  console.log('\n✅ Assignments:', assignments.length);
  const raciCounts = assignments.reduce((acc: Record<string, number>, a) => {
    acc[a.raciRole] = (acc[a.raciRole] || 0) + 1;
    return acc;
  }, {});
  console.log('   RACI breakdown:', JSON.stringify(raciCounts, null, 2));

  await prisma.$disconnect();
}

checkData().catch(console.error);
