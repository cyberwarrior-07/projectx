/*
  # Create JavaScript Practice Lab Course

  1. New Content
    - Create beginner JavaScript course
    - Add interactive coding lessons
    - Set up practice exercises
*/

DO $$ 
DECLARE
  v_course_id uuid;
  v_lesson_id uuid;
BEGIN
  -- Create the JavaScript Practice Lab course
  INSERT INTO courses (
    title,
    description,
    category,
    difficulty,
    visibility,
    thumbnail_url,
    price,
    is_featured
  ) VALUES (
    'JavaScript Practice Lab',
    'A hands-on JavaScript course for beginners with interactive coding exercises. Practice core concepts through real coding challenges and get instant feedback.',
    'Programming',
    'beginner',
    'public',
    'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a',
    0,
    true
  ) RETURNING id INTO v_course_id;

  -- Create lessons with coding exercises
  -- Lesson 1: Variables and Data Types
  INSERT INTO lessons (
    course_id,
    title,
    description,
    order_position,
    is_locked,
    duration,
    content
  ) VALUES (
    v_course_id,
    'Variables and Data Types',
    'Learn about JavaScript variables and basic data types through hands-on practice.',
    1,
    false,
    30,
    jsonb_build_object(
      'type', 'code',
      'language', 'javascript',
      'instructions', 'Practice declaring variables and working with different data types in JavaScript.

1. Create a variable called `name` and assign your name to it
2. Create a variable called `age` and assign your age to it
3. Create a variable called `isStudent` and set it to true
4. Print all variables to see their values',
      'code_template', '// Declare your variables here
let name;
let age;
let isStudent;

// Print the variables
console.log("Name:", name);
console.log("Age:", age);
console.log("Is Student:", isStudent);',
      'solution', '// Example solution
let name = "John";
let age = 25;
let isStudent = true;

console.log("Name:", name);
console.log("Age:", age);
console.log("Is Student:", isStudent);'
    )
  );

  -- Lesson 2: Basic Operators
  INSERT INTO lessons (
    course_id,
    title,
    description,
    order_position,
    is_locked,
    duration,
    content
  ) VALUES (
    v_course_id,
    'Basic Operators',
    'Practice using arithmetic and comparison operators in JavaScript.',
    2,
    true,
    45,
    jsonb_build_object(
      'type', 'code',
      'language', 'javascript',
      'instructions', 'Complete the following exercises using JavaScript operators:

1. Create two variables `num1` and `num2` with values 10 and 5
2. Calculate their sum and store in `sum`
3. Calculate their difference and store in `difference`
4. Calculate their product and store in `product`
5. Calculate their division and store in `division`
6. Compare the numbers and store the result in `isGreater`',
      'code_template', '// Create your variables
const num1 = 10;
const num2 = 5;

// Perform calculations
let sum;
let difference;
let product;
let division;
let isGreater;

// Print results
console.log("Sum:", sum);
console.log("Difference:", difference);
console.log("Product:", product);
console.log("Division:", division);
console.log("Is num1 greater than num2?", isGreater);',
      'solution', '// Create variables
const num1 = 10;
const num2 = 5;

// Perform calculations
let sum = num1 + num2;
let difference = num1 - num2;
let product = num1 * num2;
let division = num1 / num2;
let isGreater = num1 > num2;

// Print results
console.log("Sum:", sum);
console.log("Difference:", difference);
console.log("Product:", product);
console.log("Division:", division);
console.log("Is num1 greater than num2?", isGreater);'
    )
  );

  -- Lesson 3: Control Flow
  INSERT INTO lessons (
    course_id,
    title,
    description,
    order_position,
    is_locked,
    duration,
    content
  ) VALUES (
    v_course_id,
    'Control Flow',
    'Learn about if statements and loops in JavaScript.',
    3,
    true,
    40,
    jsonb_build_object(
      'type', 'code',
      'language', 'javascript',
      'instructions', 'Practice using control flow statements:

1. Write a function that checks if a number is positive, negative, or zero
2. Use a loop to print numbers from 1 to 5
3. Create a simple grade calculator (A, B, C, D, F) for a score out of 100',
      'code_template', '// Function to check number
function checkNumber(num) {
  // Your code here
}

// Loop to print numbers
// Your code here

// Grade calculator
function calculateGrade(score) {
  // Your code here
}

// Test your functions
console.log(checkNumber(5));
console.log(checkNumber(-3));
console.log(checkNumber(0));

console.log(calculateGrade(95));
console.log(calculateGrade(85));
console.log(calculateGrade(75));',
      'solution', '// Function to check number
function checkNumber(num) {
  if (num > 0) {
    return "Positive";
  } else if (num < 0) {
    return "Negative";
  } else {
    return "Zero";
  }
}

// Loop to print numbers
for (let i = 1; i <= 5; i++) {
  console.log(i);
}

// Grade calculator
function calculateGrade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// Test your functions
console.log(checkNumber(5));
console.log(checkNumber(-3));
console.log(checkNumber(0));

console.log(calculateGrade(95));
console.log(calculateGrade(85));
console.log(calculateGrade(75));'
    )
  );

END $$;