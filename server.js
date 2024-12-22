var express = require("express");
var DataLayer = require("./companydata/index.js");
const BusinessLayer = require('./BusinessLayer.js');
var dl = new DataLayer("ceb1810");


var logger = require('morgan');
var app = express();
const router = express.Router();

app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// '/CompanyServices' root path
app.use("/CompanyServices", router);

 
router.get("/department", async function(req, res) {
    const { company: companyName, dept_id: deptId } = req.query;
  

    // Validate inputs
    if (!companyName || companyName.trim().length === 0) {
        return res.status(400).json({
            error: "Missing or invalid company name."
        });
    }

    // Convert deptId to number and validate
    const departmentId = parseInt(deptId);
    if (isNaN(departmentId) || departmentId <= 0) {
        return res.status(400).json({
            error: "Invalid department ID."
        });
    }

    try {
        
        const dep = await dl.getDepartment(companyName, departmentId);

        if (!dep) {
            return res.status(404).json({
                error: `Department not found for company '${companyName}' and ID ${departmentId}.`
            });
        }

        if (!dep.getDeptName() || !dep.getDeptNo() || !dep.getLocation()) {
            return res.status(500).json({
                error: "Invalid department data: some required fields are null."
            });
        }

        // Return successful response
        return res.status(200).json({
            success: true,
            dept_id: dep.getId(),
            company: dep.getCompany(),
            dept_name: dep.getDeptName(),
            dept_no: dep.getDeptNo(),
            location: dep.getLocation()
        });

    } catch (error) {
        console.error('Error in getDepartment:', error);
        
        return res.status(500).json({
            error: `Error retrieving department for company '${companyName}' and ID ${departmentId}: ${error.message}`
        });

    } 
});

router.get("/departments", async function (req, res){
    const { company: companyName } = req.query;
    

    
    if (!companyName || companyName.trim().length === 0) {
        return res.status(400).json({
            error: "Missing or invalid company name."
        });
    }

    try {
        
        const departments = await dl.getAllDepartment(companyName);

        // Check if departments exist
        if (!departments || departments.length === 0) {
            return res.status(404).json({
                error: "No departments found for the specified company."
            });
        }

        // Map departments to JSON format
        const departmentList = departments.map(dept => ({
            dept_id: dept.getId(),
            company: dept.getCompany(),
            dept_name: dept.getDeptName(),
            dept_no: dept.getDeptNo(),
            location: dept.getLocation()
        }));

        // Return successful response
        return res.status(200).json({
            success: departmentList
        });0

    } catch (error) {
        console.error('Error in getDepartments:', error);
        
        return res.status(500).json({
            error: `An error occurred: ${error.message}`
        });

    } finally {
        if (dl) {
            try {
                await dl.close();
            } catch (error) {
                console.error('Error closing DataLayer:', error);
            }
        }
    }
    
});

router.put('/department', async (req, res) => {
    let dl = null;
    
    try {
        dl = new DataLayer("ceb1810");
        const businesslayer = new BusinessLayer(dl);

       
        const updatedDepartment = await businesslayer.updateDepartment(req.body);

        // Return successful response
        return res.status(200).json({
            success: {
                dept_id: updatedDepartment.getId(),
                company: updatedDepartment.getCompany(), 
                dept_name: updatedDepartment.getDeptName(),
                dept_no: updatedDepartment.getDeptNo(),
                location: updatedDepartment.getLocation()
            }
         });

    } catch (error) {
        console.error('Error in updateDepartment:', error);
        
       
        const isValidationError = error.message.includes('Validation failed');
        const statusCode = isValidationError ? 400 : 500;
        
        return res.status(statusCode).json({
            error: error.message
        });

    } finally {
        if (dl) {
            try {
                await dl.close();
            } catch (error) {
                console.error('Error closing DataLayer:', error);
            }
        }
    }
});


router.post("/department", async (req, res) => {
    let dl = null;
    try {
        // Extract input fields from request body
        const { company, dept_name, dept_no, location } = req.body;

        // Validate required fields
        if (!company || !dept_name || !dept_no || !location) {
            return res.status(400).json({
                error: "All fields (company, dept_name, dept_no, location) are required"
            });
        }

        // Validate that the company matches your RIT user ID
        if (company !== "ceb1810") {
            return res.status(400).json({
                error: "Company must be your valid RIT user ID"
            });
        }

        dl = new DataLayer("ceb1810");

        // Check if dept_no is unique among all companies
        const allDepartments = await dl.getAllDepartment(company);
        const isDeptNoUnique = !allDepartments.some(dept => dept.getDeptNo() === dept_no);

        if (!isDeptNoUnique) {
            return res.status(400).json({
                error: "Department number must be unique across all companies"
            });
        }

        // Create new department
        const newDept = new dl.Department();
        newDept.setCompany(company);
        newDept.setDeptName(dept_name);
        newDept.setDeptNo(dept_no);
        newDept.setLocation(location);

        // Insert the department into the database
        const insertedDept = await dl.insertDepartment(newDept);

        // Return success response
        return res.status(201).json({
            success: {
                dept_id: insertedDept.getId(),
                company: insertedDept.getCompany(),
                dept_name: insertedDept.getDeptName(),
                dept_no: insertedDept.getDeptNo(),
                location: insertedDept.getLocation()
            }
        });
    } catch (error) {
        console.error('Error in createDepartment:', error);

        // Return error response
        return res.status(500).json({
            error: `An error occurred: ${error.message}`
        });
    // } finally {
    //     if (dl) {
    //         try {
    //             await dl.close();
    //         } catch (error) {
    //             console.error('Error closing DataLayer:', error);
    //         }
    //     }
    // }

    }
});

router.delete("/department", async (req, res) => {
    let dl = null;
    try {
        // Extract query parameters
        const { company, dept_id } = req.query;

        // Validate required fields
        if (!company || !dept_id) {
            return res.status(400).json({
                error: "Both company and dept_id query parameters are required"
            });
        }

        // Validate that the company matches your RIT user ID
        if (company !== "ceb1810") {
            return res.status(400).json({
                error: "Company must be your valid RIT user ID"
            });
        }

        // Convert dept_id to a number
        const departmentId = parseInt(dept_id);
        if (isNaN(departmentId) || departmentId <= 0) {
            return res.status(400).json({
                error: "dept_id must be a valid positive integer"
            });
        }

        dl = new DataLayer("ceb1810");

        // Attempt to delete the department
        const rowsDeleted = await dl.deleteDepartment(company, departmentId);

        // Check if a department was deleted
        if (rowsDeleted === 0) {
            return res.status(404).json({
                error: `No department found with ID ${departmentId} for company '${company}'`
            });
        }

        // Return success response
        return res.status(200).json({
            success: `Department ${departmentId} from ${company} deleted.`
        });
    } catch (error) {
        console.error('Error deleting department:', error);

        // Return server error response
        return res.status(500).json({
            error: `An error occurred: ${error.message}`
        });
    // } finally {
    //     if (dl) {
    //         try {
    //             await dl.close();
    //         } catch (error) {
    //             console.error('Error closing DataLayer:', error);
    //         }
    //     }
    // }
    }
});


router.get("/employee", async (req, res) => {
    let dl = null;
    try {
        // Extract query parameters
        const {emp_id } = req.query;

        // Validate required fields
        if (!emp_id) {
            return res.status(400).json({
                error: "enter an id"
            });
        }

      

        // Convert emp_id to a number
        const employeeId = parseInt(emp_id);
        if (isNaN(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                error: "emp_id must be a valid positive integer."
            });
        }

        dl = new DataLayer("ceb1810");

        // Fetch the employee record
        const employee = await dl.getEmployee(employeeId);

        // Check if the employee exists
        if (!employee) {
            return res.status(404).json({
                error: `No employee found with ID ${employeeId} for company '${company}'.`
            });
        }

        // Return successful response
        return res.status(200).json({
            emp_id: employee.getId(),
            emp_name: employee.getEmpName(),
            emp_no: employee.getEmpNo(),
            hire_date: employee.getHireDate(),
            job: employee.getJob(),
            salary: employee.getSalary(),
            dept_id: employee.getDeptId(),
            mng_id: employee.getMngId()
        });

    } catch (error) {
        console.error("Error in getting employee:", error);

        // Return server error response
        return res.status(500).json({
            error: `An error occurred: ${error.message}`
        });
    // } 
    }
});

router.get("/employees", async (req, res) => {
    let dl = null;
    try {
        // Extract query parameter
        const { company } = req.query;

        // Validate the 'company' query parameter
        if (!company) {
            return res.status(400).json({
                error: "The 'company' query parameter is required."
            });
        }

        // Check if the company matches your RIT user ID
        if (company !== "ceb1810") {
            return res.status(400).json({
                error: "Invalid company name. Must be your RIT user ID."
            });
        }

        dl = new DataLayer("ceb1810");

        // Fetch all employees for the given company
        const employees = await dl.getAllEmployee(company);

        // Check if any employees exist
        if (!employees || employees.length === 0) {
            return res.status(404).json({
                error: `No employees found for company '${company}'.`
            });
        }

        // Map employees to JSON format
        const employeeList = employees.map(employee => ({
            emp_id: employee.getId(),
            emp_name: employee.getEmpName(),
            emp_no: employee.getEmpNo(),
            hire_date: employee.getHireDate(),
            job: employee.getJob(),
            salary: employee.getSalary(),
            dept_id: employee.getDeptId(),
            mng_id: employee.getMngId()
        }));

        // Return the list of employees
        return res.status(200).json(employeeList);

    } catch (error) {
        console.error("Error in getAllEmployees:", error);

        // Return server error response
        return res.status(500).json({
            error: `An error occurred: ${error.message}`
        });
    // } finally {
    //     if (dl) {
    //         try {
    //             await dl.close();
    //         } catch (error) {
    //             console.error("Error closing DataLayer:", error);
    //         }
    //     }
    // }
    }
});

router.post("/employee", async (req, res) => {
    let dl = null;

    try {
        dl = new DataLayer("ceb1810");
        const businessLayer = new BusinessLayer(dl);

        
        const {
            company,
            emp_name,
            emp_no,
            hire_date,
            job,
            salary,
            dept_id,
            mng_id
        } = req.body;

        // Perform all validations
        if (company !== "ceb1810") {
            return res.status(400).json({
                error: "Invalid company name. Must be your RIT user ID."
            });
        }

        await businessLayer.validateDepartment(company, dept_id);
        await businessLayer.validateManager( mng_id);
        businessLayer.validateHireDate(hire_date);
        await businessLayer.validateEmployeeNumber(emp_no);

        const newEmployee = new dl.Employee();
        
        newEmployee.setEmpName(emp_name);
        newEmployee.setEmpNo(emp_no)
        newEmployee.setHireDate(hire_date);
        newEmployee.setJob(job);
        newEmployee.setDeptId(dept_id);
        newEmployee.setMngId(mng_id);
        newEmployee.setSalary(salary)
        
        // Create new employee
        const insertedEmployee = await dl.insertEmployee(newEmployee);

        // Return success response
        return res.status(201).json({
            success: {
                emp_id: insertedEmployee.getId(),
                emp_name: insertedEmployee.getEmpName(),
                emp_no: insertedEmployee.getEmpNo(),
                hire_date: insertedEmployee.getHireDate(),
                job: insertedEmployee.getJob(),
                salary: insertedEmployee.getSalary(),
                dept_id: insertedEmployee.getDeptId(),
                mng_id: insertedEmployee.getMngId()
            }
        });

    } catch (error) {
        console.error('Error in updating employee:', error);
        return res.status(400).json({ error: error.message });
    // } finally {
    //     if (dl) {
    //         try {
    //             await dl.close();
    //         } catch (err) {
    //             console.error('Error closing DataLayer:', err);
    //         }
    //     }
    // }
    }
});

router.put("/employee", async (req, res) => { //edit so that new emp has updated values 
    const {
        company,
        emp_id,
        emp_name,
        emp_no,
        hire_date,
        job,
        salary,
        dept_id,
        mng_id
    } = req.body;

    try {
        const dl = new DataLayer("ceb1810"); // Initialize the DataLayer
        const businessLayer = new BusinessLayer(dl);

        // Validate input
        if (!company || company.trim() !== "ceb1810") {
            throw new Error("Invalid company name. Must be your RIT username.");
        }

        if (!emp_id || isNaN(emp_id)) {
            throw new Error("Invalid or missing employee ID.");
        }

        var EmployeeToUpdate = await dl.getEmployee(emp_id);
        console.log('Employee:', EmployeeToUpdate);

        if(EmployeeToUpdate === null){
            throw new Error("Employee not found.");
        }
        // Run business-layer validations
        // await businessLayer.validateEmpId(emp_id); // Ensure emp_id exists
        
        // await businessLayer.validateUniqueEmpNo(emp_no); // Ensure emp_no is unique
        businessLayer.validateHireDate(hire_date); // Check hire_date format and weekday
        // await businessLayer.validateDeptId(company, dept_id); // Ensure dept_id exists
        // await businessLayer.validateMngId(company, mng_id); // Ensure mng_id exists or is 0

        EmployeeToUpdate.setEmpName(emp_name);
        EmployeeToUpdate.setEmpNo(emp_no);
        EmployeeToUpdate.setHireDate(hire_date);
        EmployeeToUpdate.setJob(job);
        EmployeeToUpdate.setSalary(salary);
        EmployeeToUpdate.setDeptId(dept_id);
        EmployeeToUpdate.setMngId(mng_id);
                

        // Update the employee record
       await dl.updateEmployee(EmployeeToUpdate);

        if (!EmployeeToUpdate) {
            throw new Error("Failed to update the employee record. Please check your inputs.");
        }

        // Return the updated employee as JSON
        return res.status(200).json({
            success: {
                emp_id: EmployeeToUpdate.getId(),
                emp_name: EmployeeToUpdate.getEmpName(),
                emp_no: EmployeeToUpdate.getEmpNo(),
                hire_date: EmployeeToUpdate.getHireDate(),
                job: EmployeeToUpdate.getJob(),
                salary: EmployeeToUpdate.getSalary(),
                dept_id: EmployeeToUpdate.getDeptId(),
                mng_id: EmployeeToUpdate.getMngId()
            }
        });
    } catch (error) {
        console.error("Error updating employee:", error.message);
        return res.status(400).json({ error: error.message });
    }
});


router.delete("/employee", async (req, res) => {
    const { company, emp_id } = req.query;

    try {
        const dl = new DataLayer(company); // Initialize the DataLayer
       
        // Validate inputs
        if (!company || company.trim() !== "ceb1810") {
            throw new Error("Invalid company name. Must be your RIT username.");
        }

        if (!emp_id || isNaN(emp_id)) {
            throw new Error("Invalid or missing employee ID.");
        }

        

        // Attempt to delete the employee
        const deletedRows = await dl.deleteEmployee(emp_id);

        if (deletedRows === 0) {
            throw new Error(`No employee found with ID ${emp_id} for company ${company}.`);
        }

        // Return success response
        return res.status(200).json({
            success: `Employee ${emp_id} deleted.`
        });
    } catch (error) {
        console.error("Error in deleting employee:", error.message);
        return res.status(400).json({ error: error.message });
    }
});

router.get("/timecard", async (req, res) => {
    const { company, timecard_id } = req.query;
 
    try {
        const dl = new DataLayer("ceb1810");
 
        if (!company || company !== "ceb1810") {
            throw new Error("Invalid company name. Must be your RIT username.");
        }
 
        if (!timecard_id || isNaN(timecard_id)) {
            throw new Error("Invalid or missing timecard ID."); 
        }
 
        const timecard = await dl.getTimecard(timecard_id);
        
        if (!timecard) {
            throw new Error("Timecard not found.");
        }
 
        res.json({
            success: {
                timecard_id: timecard.getId(),
                start_time: timecard.getStartTime(),
                end_time: timecard.getEndTime(),
                emp_id: timecard.getEmpId()
            }
        });
 
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
 });

 router.get("/timecards", async (req, res) => {
    const { company, emp_id } = req.query;
 
    try {
        const dl = new DataLayer("ceb1810");
 
        if (!company || company !== "ceb1810") {
            throw new Error("Invalid company name. Must be your RIT username.");
        }
 
        if (!emp_id || isNaN(emp_id)) {
            throw new Error("Invalid or missing employee ID.");
        }
 
        const timecards = await dl.getAllTimecard(emp_id);
 
        const formattedTimecards = timecards.map(timecard => ({
            timecard_id: timecard.getId(),
            start_time: timecard.getStartTime(),
            end_time: timecard.getEndTime(), 
            emp_id: timecard.getEmpId()
        }));
 
        res.json({
            success:formattedTimecards
                
            
        });
 
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
 });


 router.put("/timecard", async (req, res) => {
    const { company, timecard_id, emp_id, start_time, end_time } = req.body;

    try {
        const dl = new DataLayer("ceb1810");
        const businessLayer = new BusinessLayer(dl);

        // Validate company
        if (!company || company !== "ceb1810") {
            throw new Error("Invalid company name. Must be your RIT username.");
        }

       
        await businessLayer.validateEmployee(emp_id); 
        await businessLayer.validateStartTime(start_time); 
        await businessLayer.validateEndTime(start_time, end_time); 
        

        // get the existing timecard
        const existingTimecard = await dl.getTimecard(timecard_id);
        if (!existingTimecard) {
            throw new Error(`Timecard with ID ${timecard_id} does not exist.`);
        }

        // Update the timecard fields
        existingTimecard.setStartTime(start_time);
        existingTimecard.setEndTime(end_time);
        existingTimecard.setEmpId(emp_id);

        // Save the updated timecard
        const updatedTimecard = await dl.updateTimecard(existingTimecard);

        return res.status(200).json({
            success: {
                timecard_id: updatedTimecard.getId(),
                start_time: updatedTimecard.getStartTime(),
                end_time: updatedTimecard.getEndTime(),
                emp_id: updatedTimecard.getEmpId()
            }
        });
    } catch (error) {
        console.error("Error updating timecard:", error.message);
        return res.status(400).json({ error: error.message });
    }
});




 router.post("/timecard", async (req, res) => {
    const { company, emp_id, start_time, end_time } = req.body;

    try {
        const dl = new DataLayer(company);
        const businessLayer = new BusinessLayer(dl);

       
        if (!company || company !== "ceb1810") {
            throw new Error("Invalid company name. Must be your RIT username.");
        }

        
        await businessLayer.validateEmployee(emp_id);
        await businessLayer.validateStartTime(start_time);
        await businessLayer.validateEndTime(start_time, end_time);
        await businessLayer.validateNoDuplicateTimecard(emp_id, start_time);

        // Create and save new timecard
        const newTimecard = new dl.Timecard();
        newTimecard.setStartTime(start_time);
        newTimecard.setEndTime(end_time);
        newTimecard.setEmpId(emp_id);

        const insertedTimecard = await dl.insertTimecard(newTimecard);

        return res.status(201).json({
            success: {
                timecard_id: insertedTimecard.getId(),
                start_time: insertedTimecard.getStartTime(),
                end_time: insertedTimecard.getEndTime(),
                emp_id: insertedTimecard.getEmpId()
            }
        });

    } catch (error) {
        console.error("Error creating timecard:", error.message);
        return res.status(400).json({ error: error.message });
    }
});


router.delete("/timecard", async (req, res) => {
    const { company, timecard_id } = req.query;
 
    try {
        const dl = new DataLayer("ceb1810");
 
     
        if (!company || company !== "ceb1810") {
            throw new Error("Invalid company name. Must be your RIT username.");
        }
 
       
        if (!timecard_id || isNaN(timecard_id)) {
            throw new Error("Invalid or missing timecard ID.");
        }
 
       
        const timecard = await dl.getTimecard(timecard_id);
        if (!timecard) {
            throw new Error("Timecard not found.");
        }
 
     
        await dl.deleteTimecard(timecard_id);
 
        return res.json({
            success: `Timecard ${timecard_id} deleted.`
        });
 
    } catch (error) {
        console.error("Error deleting timecard:", error.message);
        return res.status(400).json({ error: error.message });
    }
 });


// Start the server
app.listen(8282, () => {
    console.log("Server started on port 8282");
});
