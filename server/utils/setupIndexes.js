/**
 * Database Indexes Setup
 * Run this once during deployment or app initialization
 */

const setupDatabaseIndexes = async (db) => {
  try {
    console.log('Setting up database indexes...');

    // Users Collection Indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    console.log('✓ Users indexes created');

    // Courses Collection Indexes
    await db.collection('courses').createIndex({ facilitator: 1 });
    await db.collection('courses').createIndex({ status: 1 });
    await db.collection('courses').createIndex({ category: 1 });
    await db.collection('courses').createIndex({ createdAt: -1 });
    await db.collection('courses').createIndex({ enrolled: -1 }); // For sorting by popularity
    await db.collection('courses').createIndex({ rating: -1 }); // For sorting by rating
    await db.collection('courses').createIndex({ 
      title: 'text', 
      shortDescription: 'text',
      category: 'text'
    }, { name: 'course_text_search' }); // Text search index
    console.log('✓ Courses indexes created');

    // Enrollments Collection Indexes
    await db.collection('enrollments').createIndex({ studentId: 1 });
    await db.collection('enrollments').createIndex({ courseId: 1 });
    await db.collection('enrollments').createIndex({ studentId: 1, courseId: 1 }, { unique: true });
    await db.collection('enrollments').createIndex({ enrolledAt: -1 });
    await db.collection('enrollments').createIndex({ progress: 1 });
    await db.collection('enrollments').createIndex({ active: 1 });
    await db.collection('enrollments').createIndex({ certificateIssued: 1 });
    console.log('✓ Enrollments indexes created');

    // Forum Posts Collection Indexes
    await db.collection('forumposts').createIndex({ courseId: 1 });
    await db.collection('forumposts').createIndex({ author: 1 });
    await db.collection('forumposts').createIndex({ isCommunityPost: 1 });
    await db.collection('forumposts').createIndex({ createdAt: -1 });
    await db.collection('forumposts').createIndex({ isPinned: -1, createdAt: -1 });
    console.log('✓ Forum posts indexes created');

    // Notifications Collection Indexes
    await db.collection('notifications').createIndex({ userId: 1 });
    await db.collection('notifications').createIndex({ read: 1 });
    await db.collection('notifications').createIndex({ createdAt: -1 });
    await db.collection('notifications').createIndex({ userId: 1, read: 1, createdAt: -1 });
    console.log('✓ Notifications indexes created');

    // Contact Messages Collection Indexes
    await db.collection('contacts').createIndex({ status: 1 });
    await db.collection('contacts').createIndex({ createdAt: -1 });
    await db.collection('contacts').createIndex({ email: 1 });
    console.log('✓ Contacts indexes created');

    // Resources Collection Indexes (if exists)
    await db.collection('resources').createIndex({ courseId: 1 });
    await db.collection('resources').createIndex({ uploadedBy: 1 });
    await db.collection('resources').createIndex({ createdAt: -1 });
    console.log('✓ Resources indexes created');

    console.log('✅ All database indexes created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    throw error;
  }
};

module.exports = setupDatabaseIndexes;
