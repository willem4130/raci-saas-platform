import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: 'TechCorp Solutions' }
  });

  if (!org) {
    console.log('No org found');
    return;
  }

  console.log('Org ID:', org.id);

  const activeMembers = await prisma.member.findMany({
    where: {
      organizationId: org.id,
      status: 'ACTIVE'
    },
    include: { user: true }
  });

  console.log('\nACTIVE members:', activeMembers.length);
  activeMembers.forEach(m => console.log('-', m.user.name, '|', m.jobTitle, '| Role:', m.role));

  // Check if there are any members with different status
  const allMembers = await prisma.member.findMany({
    where: {
      organizationId: org.id
    }
  });

  console.log('\nTotal members (all statuses):', allMembers.length);

  await prisma.$disconnect();
}

main();
