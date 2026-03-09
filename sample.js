// true =>

state: [
    {
        name: "rajasthan",
        id: 1,
        district: [
            {
                name: "A",
                stateId: 1,
                population: 500
            }
        ]
    },
    {
        name: "Punjab",
        id: 2,
    },
    {
        name: "MP",
        id: 3
    },
]

// false :

state: [
    {
        name: "rajasthan",
        id: 1,
        district: [
            {
                name: "A",
                stateId: 1,
                population: 500
            }
        ]
    },
    {
        name: "Punjab",
        id: 2,
        district: []
    },
    {
        name: "MP",
        id: 3,
        district: []
    },
]