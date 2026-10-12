import { SIDE_HOLES, TOP_HOLES, type CheeseHole } from './Playground/cheeseHoles';

function holeStyle(hole: CheeseHole) {
	return {
		left: `${hole.left}%`,
		top: `${hole.top}%`,
		width: `${hole.size}%`,
		height: `${hole.size}%`,
		borderRadius: hole.radius,
	};
}

/**
 * The target cheese wedge. Shared by the playground cell and the while block
 * header, so both always show the same art.
 */
function TargetCheese() {
	return (
		<div class='target-cheese' aria-hidden='true'>
			<span class='target-cheese-side'>
				{SIDE_HOLES.map((hole) => (
					<span
						key={`${hole.left}-${hole.top}`}
						class='target-cheese-hole'
						style={holeStyle(hole)}
					/>
				))}
			</span>
			<span class='target-cheese-top'>
				{TOP_HOLES.map((hole) => (
					<span
						key={`${hole.left}-${hole.top}`}
						class='target-cheese-hole'
						style={holeStyle(hole)}
					/>
				))}
			</span>
		</div>
	);
}

export default TargetCheese;
