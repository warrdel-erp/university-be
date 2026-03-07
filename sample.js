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


const data1 = {
    "courseId": 1,
    "courseName": "abx",
    "classSectionsId": 1,
    "classSectionsName": "abx",
    "routines": [
        {
            "name": "new time table",
            "startDate": "2025-07-18",
            "endDate": "2025-07-31",
            "timeTableRoutineId": 1,
            "timeTableNameId": 1,
            "periods": [
                {
                    "name": "Period1",
                    "startTime": "09:00 am",
                    "endTime": "09:30 am",
                    "isBreak": false,
                    "days": [
                        {
                            "name": "Monday",
                            "scheduleItems": [
                                {
                                    "type": "normal",
                                    "isOverridingSyblingElectives": false,
                                    "overrideCondition": [
                                        "override",
                                        "coexists"
                                    ],
                                    "subject": {
                                        "name": "check subject",
                                        "subjectId": 1,
                                        "subjectCode": "sub-01"
                                    },
                                    "teacher": [
                                        {
                                            "isTeacher": "Primary",
                                            "isAttendence": true,
                                            "pickColor": "#ff0000",
                                            "employeeId": 1,
                                            "employeeCode": "001",
                                            "name": "Suki Tyson",
                                            "room": {
                                                "name": "102A",
                                                "roomId": 1
                                            }
                                        },
                                        {
                                            "isTeacher": "secoundry",
                                            "isAttendence": false,
                                            "pickColor": "#ff0000",
                                            "employeeId": 2,
                                            "employeeCode": "002",
                                            "name": "Suki sd",
                                            "room": {
                                                "name": "103A",
                                                "roomId": 2
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
    ]
}