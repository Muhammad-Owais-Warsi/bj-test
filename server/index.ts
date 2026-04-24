const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

function processInput(data) {
    const validEdges = [];
    const seen = new Set();
    const invalidEntries = [];
    const duplicateEdges = [];

    for (let raw of data) {
        if (!raw) {
            invalidEntries.push(raw);
            continue;
        }

        const entry = raw.trim();

        const isValid = /^[A-Z]->[A-Z]$/.test(entry);

        if (!isValid || entry[0] === entry[3]) {
            invalidEntries.push(raw);
            continue;
        }

        if (seen.has(entry)) {
            if (!duplicateEdges.includes(entry)) {
                duplicateEdges.push(entry);
            }
            continue;
        }

        seen.add(entry);
        validEdges.push(entry);
    }

    return { validEdges, invalidEntries, duplicateEdges };
}

function buildGraph(edges) {
    const adjList = new Map();
    const parentMap = new Map();
    const nodes = new Set();

    for (let edge of edges) {
        const [p, c] = edge.split("->");

        nodes.add(p);
        nodes.add(c);

        // multi-parent: ignore later ones
        if (parentMap.has(c)) continue;

        parentMap.set(c, p);

        if (!adjList.has(p)) adjList.set(p, []);
        adjList.get(p).push(c);
    }

    return { adjList, parentMap, nodes };
}

function getComponents(nodes, adjList) {
    const visited = new Set();
    const components = [];

    function dfs(node, comp) {
        if (visited.has(node)) return;
        visited.add(node);
        comp.push(node);

        const children = adjList.get(node) || [];
        for (let child of children) dfs(child, comp);

        // reverse edges
        for (let [p, children] of adjList.entries()) {
            if (children.includes(node)) dfs(p, comp);
        }
    }

    for (let node of nodes) {
        if (!visited.has(node)) {
            const comp = [];
            dfs(node, comp);
            components.push(comp);
        }
    }

    return components;
}

function hasCycle(component, adjList) {
    const visited = new Set();
    const stack = new Set();

    function dfs(node) {
        if (stack.has(node)) return true;
        if (visited.has(node)) return false;

        visited.add(node);
        stack.add(node);

        const children = adjList.get(node) || [];

        for (let child of children) {
            if (dfs(child)) return true;
        }

        stack.delete(node);
        return false;
    }

    for (let node of component) {
        if (dfs(node)) return true;
    }

    return false;
}

function buildTree(node, adjList) {
    const children = adjList.get(node) || [];
    const obj = {};

    for (let child of children) {
        obj[child] = buildTree(child, adjList);
    }

    return obj;
}

function getDepth(node, adjList) {
    const children = adjList.get(node) || [];

    if (children.length === 0) return 1;

    let max = 0;
    for (let c of children) {
        max = Math.max(max, getDepth(c, adjList));
    }

    return 1 + max;
}

function buildHierarchies(nodes, adjList, parentMap) {
    const components = getComponents(nodes, adjList);
    const hierarchies = [];

    for (let comp of components) {
        const cycle = hasCycle(comp, adjList);

        if (cycle) {
            const root = [...comp].sort()[0];

            hierarchies.push({
                root,
                tree: {},
                has_cycle: true,
            });

            continue;
        }

        const root = comp.find((n) => !parentMap.has(n));

        const tree = {};
        tree[root] = buildTree(root, adjList);

        const depth = getDepth(root, adjList);

        hierarchies.push({
            root,
            tree,
            depth,
        });
    }

    return hierarchies;
}

function buildSummary(hierarchies) {
    let totalTrees = 0;
    let totalCycles = 0;
    let maxDepth = 0;
    let largestTreeRoot = "";

    for (let h of hierarchies) {
        if (h.has_cycle) {
            totalCycles++;
        } else {
            totalTrees++;

            if (
                h.depth > maxDepth ||
                (h.depth === maxDepth && h.root < largestTreeRoot)
            ) {
                maxDepth = h.depth;
                largestTreeRoot = h.root;
            }
        }
    }

    return {
        total_trees: totalTrees,
        total_cycles: totalCycles,
        largest_tree_root: largestTreeRoot,
    };
}

function processData(data) {
    const { validEdges, invalidEntries, duplicateEdges } = processInput(data);

    const { adjList, parentMap, nodes } = buildGraph(validEdges);

    const hierarchies = buildHierarchies(nodes, adjList, parentMap);

    const summary = buildSummary(hierarchies);

    return {
        user_id: "muhammadowaiswarsi_18022005",
        email_id: "mw1078@srmist.edu.in",
        college_roll_number: "RA2311003020332",
        hierarchies,
        invalid_entries: invalidEntries,
        duplicate_edges: duplicateEdges,
        summary,
    };
}

app.get("/", (req, res) => {
    try {
        res.send("Hello");
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/bfhl", (req, res) => {
    try {
        const { data } = req.body;

        if (!Array.isArray(data)) {
            return res.status(400).json({ error: "Invalid input format" });
        }

        const result = processData(data);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
