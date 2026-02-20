const data = {
    routines: [
        {
            "name": "Routine 1",
            "startDate": "2023-01-01",
            "endDate": "2023-01-31",
            "periods": [
                {
                    "name": "Period 1",
                    "startTime": "08:00",
                    "endTime": "09:00",
                    "days": [
                        {
                            "name": "Monday",
                            "scheduleItems": [
                                {
                                    "type": "normal",
                                    "teacher": {
                                        "name": "John Doe"
                                    },
                                    "subject": {
                                        "name": "Mathematics"
                                    },
                                    "room": {
                                        "name": "Room 101"
                                    }
                                },
                                {
                                    "type": "elective",
                                    "teacher": {
                                        "name": "John Doe"
                                    },
                                    "subject": {
                                        "name": "Mathematics"
                                    },
                                    "room": {
                                        "name": "Room 101"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}