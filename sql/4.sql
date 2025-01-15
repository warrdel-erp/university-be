CREATE TABLE transport_route (
    transport_route_id INT AUTO_INCREMENT PRIMARY KEY,
    route_title VARCHAR(255) NOT NULL,
    fare DECIMAL(10, 2) NOT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE transport_vehicle (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(255) NOT NULL,
    vehicle_model VARCHAR(255) NOT NULL,
    made_year VARCHAR(4) NOT NULL,
    employee_id INT NOT NULL,
    note TEXT NULL,
    created_by INT NOT NULL,
    updated_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
	FOREIGN KEY (employee_id) REFERENCES employee(employee_id),
	FOREIGN KEY (created_by) REFERENCES users(user_id),
	FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

CREATE TABLE `assign_vehicle` (
    `assign_vehicle_id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `transport_route_id` INT NOT NULL,
    `vehicle_id` INT NOT NULL,
    `created_by` INT NOT NULL,
    `updated_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME DEFAULT NULL,
    FOREIGN KEY (`transport_route_id`) REFERENCES `transport_route`(`transport_route_id`),
    FOREIGN KEY (`vehicle_id`) REFERENCES `transport_vehicle`(`vehicle_id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`),
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`user_id`)
);