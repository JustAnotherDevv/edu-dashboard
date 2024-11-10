import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkTables() {
  const { error: studentsError } = await supabase
    .from("students")
    .select("id")
    .limit(1);

  const { error: activityError } = await supabase
    .from("learning_activities")
    .select("id")
    .limit(1);

  if (studentsError || activityError) {
    console.log(
      "Tables not found. Please create them using the SQL from README.md file"
    );
    throw new Error("Please create the required tables first");
  }
}

async function generateStudents(count) {
  console.log(`\n📚 Generating ${count} students...`);
  const students = [];

  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom();

    const student = {
      wallet_address: wallet.address,
      student_name: faker.person.fullName(),
      grade_level: faker.number.int({ min: 9, max: 12 }),
      learning_points: faker.number.int({ min: 0, max: 1000 }),
    };

    students.push(student);
  }

  const { error } = await supabase.from("students").insert(students);

  if (error) {
    console.error("Error inserting students:", error);
    throw error;
  }

  console.log(`✅ Generated ${count} students`);
  return students;
}

async function generateLearningActivities(students) {
  console.log(`\n📝 Generating random learning activities for each student...`);
  const activityTypes = [
    "COURSE_COMPLETION",
    "ASSIGNMENT_SUBMISSION",
    "PEER_REVIEW",
    "RESOURCE_ACCESS",
    "GROUP_PROJECT",
    "QUIZ_COMPLETION",
  ];

  const educationalResources = [
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", // Math Course
    "0x123d35Cc6634C0532925a3b844Bc454e4438f123", // Science Lab
    "0x456d35Cc6634C0532925a3b844Bc454e4438f456", // History Module
    "0x789d35Cc6634C0532925a3b844Bc454e4438f789", // Literature Course
    "0xabcd35Cc6634C0532925a3b844Bc454e4438fabc", // Computer Science Workshop
  ];

  for (const student of students) {
    const activityCount = faker.number.int({ min: 10, max: 30 });
    console.log(
      `Generating ${activityCount} activities for ${student.student_name}`
    );

    for (let i = 0; i < activityCount; i++) {
      const activity = {
        student_address: student.wallet_address,
        resource_address: faker.helpers.arrayElement(educationalResources),
        points_earned: parseFloat(
          faker.number.float({ min: 1, max: 50, precision: 0.1 })
        ),
        activity_type: faker.helpers.arrayElement(activityTypes),
        timestamp: faker.date.recent({ days: 90 }), // Activities within last 90 days
      };

      const { error } = await supabase
        .from("learning_activities")
        .insert(activity);

      if (error) {
        console.error("Error inserting learning activity:", error);
        continue;
      }

      console.log(
        `✅ Activity: ${activity.student_address.slice(
          0,
          6
        )}...${activity.student_address.slice(-4)} | ${
          activity.activity_type
        } | ${activity.points_earned} points`
      );

      await delay(500);
    }
  }
}

async function generateMockData() {
  try {
    console.log("🚀 Starting educational mock data generation...");
    await checkTables();

    const students = await generateStudents(10);
    await generateLearningActivities(students);

    console.log(
      "\n✨ Educational mock data generation completed successfully!"
    );
  } catch (error) {
    console.error("❌ Error generating mock data:", error);
  }
}

generateMockData();
