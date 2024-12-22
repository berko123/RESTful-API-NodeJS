const moment = require('moment');

class BusinessLayer {
    constructor(dataLayer) {
        this.dataLayer = dataLayer;
    }

    async validateDepartmentUpdate(deptData) {
        const errors = [];

        // Validate required fields
        if (!deptData.dept_id || !deptData.company) {
            errors.push("Department ID and company name are required");
        }

        try {
            // Check if department exists
            const existingDept = await this.dataLayer.getDepartment(deptData.company, deptData.dept_id);
            if (!existingDept) {
                errors.push("Department not found");
                return { valid: false, errors };
            }

            // Validate dept_no uniqueness (only if it's being updated)
            if (deptData.dept_no && deptData.dept_no !== existingDept.getDeptNo()) {
                // Get all departments to check for uniqueness
                const allDepartments = await this.dataLayer.getAllDepartment(deptData.company);
                const isDeptNoUnique = !allDepartments.some(dept => 
                    dept.getDeptNo() === deptData.dept_no && 
                    dept.getId() !== deptData.dept_id
                );

                if (!isDeptNoUnique) {
                    errors.push("Department number must be unique across all companies");
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                existingDept
            };
        } catch (error) {
            errors.push(`Validation error: ${error.message}`);
            return { valid: false, errors };
        }
    }

    async updateDepartment(deptData) {
        // Perform validation
        const validationResult = await this.validateDepartmentUpdate(deptData);
        
        if (!validationResult.valid) {
            throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
        }

        // Update only the fields that are provided
        const existingDept = validationResult.existingDept;
        if (deptData.dept_name) existingDept.setDeptName(deptData.dept_name);
        if (deptData.dept_no) existingDept.setDeptNo(deptData.dept_no);
        if (deptData.location) existingDept.setLocation(deptData.location);

        // Perform update
        return await this.dataLayer.updateDepartment(existingDept);
    }

    async validateDepartment(company, deptId) {
        const department = await this.dataLayer.getDepartment(company, deptId);
        if (!department) {
            throw new Error(`Invalid department ID: ${deptId} does not exist in company '${company}'.`);
        }
    }

    async validateManager(mngId) {
        if (mngId === 0) return; // No manager required for first employee

        const manager = await this.dataLayer.getEmployee(mngId);
        if (!manager) {
            throw new Error(`Invalid manager ID: ${mngId}.`);
        }
    }

    validateHireDate(hireDate) {
        const date = moment(hireDate, "YYYY-MM-DD", true);
        if (!date.isValid() || date.isAfter(moment())) {
            throw new Error("Hire date must be a valid date and cannot be in the future.");
        }
        const dayOfWeek = date.isoWeekday();
        if (dayOfWeek >= 6) {
            throw new Error("Hire date must be a Monday through Friday. Weekends are not allowed.");
        }
    }

    async validateEmployeeNumber(empNo) {
        const existingEmployee = await this.dataLayer.getEmployee(empNo);
        if (existingEmployee) {
            throw new Error(`Employee number '${empNo}' must be unique.`);
        }
    }

    // async validateEmpId(empNo) {
    //     const existingEmployee = await this.dataLayer.getEmployee(empNo);
    //     if (existingEmployee) {
    //         throw new Error(`Employee number '${empNo}' must be unique.`);
    //     }
    // }

    async validateStartTime(startTime) {
        const startDate = new Date(startTime.replace(' ', 'T'));
        
        if (isNaN(startDate.getTime())) {
            throw new Error("Invalid start time format.");
        }
     
        // Validate not weekend
        const weekday = startDate.getDay();
        if (weekday === 0 || weekday === 6) {
            throw new Error("Start time cannot be on weekend.");
        }
     
        // Validate hours between 8:00-18:00
        const startHour = startDate.getHours();
        if (startHour < 8 || startHour > 18) {
            throw new Error("Start time must be between 08:00 and 18:00.");
        }
     
        // Get current date and previous Monday
        const currentDate = new Date();
        const prevMonday = new Date(currentDate);
        
        // Set previous Monday
        while (prevMonday.getDay() !== 1) {  // 1 = Monday
            prevMonday.setDate(prevMonday.getDate() - 1);
        }
        prevMonday.setHours(0, 0, 0, 0);
     
        console.log('Start Date:', startDate);
        console.log('Current Date:', currentDate);
        console.log('Previous Monday:', prevMonday);
     
        if (startDate < prevMonday || startDate > currentDate) {
            throw new Error("Start time must be between current date and previous Monday.");
        }
     }

    async validateEndTime(startTime, endTime) {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        if (isNaN(endDate.getTime())) {
            throw new Error("Invalid end time format.");
        }

        // Validate at least 1 hour difference
        const hourDiff = (endDate - startDate) / (1000 * 60 * 60);
        if (hourDiff < 1) {
            throw new Error("End time must be at least 1 hour after start time.");
        }

        // Validate same day
        if (startDate.getDate() !== endDate.getDate() ||
            startDate.getMonth() !== endDate.getMonth() ||
            startDate.getFullYear() !== endDate.getFullYear()) {
            throw new Error("End time must be on the same day as start time.");
        }

        // Validate hours
        const endHour = endDate.getHours();
        if (endHour < 8 || endHour > 18) {
            throw new Error("End time must be between 08:00 and 18:00.");
        }
    }

    async validateNoDuplicateTimecard(emp_id, startTime) {
        const startDate = new Date(startTime);
        const timecards = await this.dataLayer.getAllTimecard(emp_id);
        
        const hasExisting = timecards.some(timecard => {
            const existingDate = new Date(timecard.getStartTime());
            return existingDate.getDate() === startDate.getDate() &&
                   existingDate.getMonth() === startDate.getMonth() &&
                   existingDate.getFullYear() === startDate.getFullYear();
        });

        if (hasExisting) {
            throw new Error("Employee already has a timecard for this date.");
        }
    }

    async validateEmployee(emp_id) {
        const employee = await this.dataLayer.getEmployee(emp_id);
        if (!employee) {
            throw new Error("Employee ID does not exist.");
        }
    }
}

module.exports = BusinessLayer;

 