/*
  # Update Python Labs Course Content

  1. Changes
    - Add proper coding exercise content to lessons
    - Update lesson structure for better practice flow
    - Add test cases for code validation

  2. Content Updates
    - Enhanced lesson descriptions
    - Added structured coding challenges
    - Included test cases and expected outputs
*/

DO $$ 
DECLARE
  v_course_id uuid;
  v_lesson_id uuid;
BEGIN
  -- Get the Python Labs course ID
  SELECT id INTO v_course_id
  FROM courses
  WHERE title = 'Python Labs: Interactive Coding Practice';

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Python Labs course not found';
  END IF;

  -- Update existing lessons with proper coding content
  UPDATE lessons
  SET content = jsonb_build_object(
    'type', 'code',
    'language', 'python',
    'instructions', 'In this exercise, you will practice working with Python variables and basic arithmetic operations. Complete the following tasks:

1. Create two variables `x` and `y` with values 10 and 5 respectively
2. Calculate and store their sum in a variable called `sum_result`
3. Calculate and store their difference in a variable called `diff_result`
4. Calculate and store their product in a variable called `prod_result`
5. Print all results',
    'starter_code', '# Create variables x and y
x = 
y = 

# Calculate sum
sum_result = 

# Calculate difference
diff_result = 

# Calculate product
prod_result = 

# Print results
print(f"Sum: {sum_result}")
print(f"Difference: {diff_result}")
print(f"Product: {prod_result}")',
    'solution', '# Create variables x and y
x = 10
y = 5

# Calculate sum
sum_result = x + y

# Calculate difference
diff_result = x - y

# Calculate product
prod_result = x * y

# Print results
print(f"Sum: {sum_result}")
print(f"Difference: {diff_result}")
print(f"Product: {prod_result}")',
    'test_cases', jsonb_build_array(
      jsonb_build_object(
        'input', '',
        'expected_output', 'Sum: 15\nDifference: 5\nProduct: 50'
      )
    )
  )
  WHERE course_id = v_course_id AND order_position = 1;

  -- Update Control Flow Practice lesson
  UPDATE lessons
  SET content = jsonb_build_object(
    'type', 'code',
    'language', 'python',
    'instructions', 'Create a program that determines the grade for a given score:

1. The program should take a numeric score as input
2. Implement the following grading scale:
   - 90-100: A
   - 80-89: B
   - 70-79: C
   - 60-69: D
   - Below 60: F
3. Print the corresponding grade',
    'starter_code', '# Get the score
score = int(input("Enter score: "))

# Determine the grade
# Your code here

# Print the grade
# Your code here',
    'solution', '# Get the score
score = int(input("Enter score: "))

# Determine and print the grade
if score >= 90:
    print("Grade: A")
elif score >= 80:
    print("Grade: B")
elif score >= 70:
    print("Grade: C")
elif score >= 60:
    print("Grade: D")
else:
    print("Grade: F")',
    'test_cases', jsonb_build_array(
      jsonb_build_object(
        'input', '95',
        'expected_output', 'Grade: A'
      ),
      jsonb_build_object(
        'input', '85',
        'expected_output', 'Grade: B'
      ),
      jsonb_build_object(
        'input', '75',
        'expected_output', 'Grade: C'
      ),
      jsonb_build_object(
        'input', '65',
        'expected_output', 'Grade: D'
      ),
      jsonb_build_object(
        'input', '55',
        'expected_output', 'Grade: F'
      )
    )
  )
  WHERE course_id = v_course_id AND order_position = 2;

  -- Update Function Challenges lesson
  UPDATE lessons
  SET content = jsonb_build_object(
    'type', 'code',
    'language', 'python',
    'instructions', 'Create a function called `calculate_factorial` that:

1. Takes a positive integer as input
2. Calculates its factorial (n!)
3. Returns the result
4. Handles edge cases (0 and 1)
5. Raises a ValueError for negative numbers

Example:
- factorial(5) = 5 * 4 * 3 * 2 * 1 = 120
- factorial(0) = 1
- factorial(1) = 1',
    'starter_code', 'def calculate_factorial(n):
    """
    Calculate the factorial of a number.
    
    Args:
        n: A non-negative integer
    
    Returns:
        The factorial of n
        
    Raises:
        ValueError: If n is negative
    """
    # Your code here
    pass

# Test cases
try:
    print(f"factorial(5) = {calculate_factorial(5)}")
    print(f"factorial(0) = {calculate_factorial(0)}")
    print(f"factorial(1) = {calculate_factorial(1)}")
    print(f"factorial(-1) = {calculate_factorial(-1)}")
except ValueError as e:
    print(f"Error: {e}")',
    'solution', 'def calculate_factorial(n):
    """
    Calculate the factorial of a number.
    
    Args:
        n: A non-negative integer
    
    Returns:
        The factorial of n
        
    Raises:
        ValueError: If n is negative
    """
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    if n == 0 or n == 1:
        return 1
    return n * calculate_factorial(n - 1)

# Test cases
try:
    print(f"factorial(5) = {calculate_factorial(5)}")
    print(f"factorial(0) = {calculate_factorial(0)}")
    print(f"factorial(1) = {calculate_factorial(1)}")
    print(f"factorial(-1) = {calculate_factorial(-1)}")
except ValueError as e:
    print(f"Error: {e}")',
    'test_cases', jsonb_build_array(
      jsonb_build_object(
        'input', '5',
        'expected_output', 'factorial(5) = 120\nfactorial(0) = 1\nfactorial(1) = 1\nError: Factorial is not defined for negative numbers'
      )
    )
  )
  WHERE course_id = v_course_id AND order_position = 3;

END $$;