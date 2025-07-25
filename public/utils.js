function areOverlapping(node1, node2) {
    const node1BoundingBox = node1.getBoundingClientRect();
    const node2BoundingBox = node2.getBoundingClientRect();
    
    return !(
        node1BoundingBox.left   > node2BoundingBox.right  ||
        node1BoundingBox.right  < node2BoundingBox.left   ||
        node1BoundingBox.bottom < node2BoundingBox.top    ||
        node1BoundingBox.top    > node2BoundingBox.bottom);
}