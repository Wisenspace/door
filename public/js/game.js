var gamePieces = {};
var context = $canvas.getContext('2d');

socket.on('playerUpdate', updatePlayers);

function updatePlayers(players) {

	var playerNames = Object.keys(players);

	playerNames.forEach(function(playerName) {
		if(playerName === user) return;
		if(!gamePieces[playerName]) {
			createNewPlayer(playerName);
		}

		var player = players[playerName];
		var gamePiece = gamePieces[playerName];
		gamePiece.x = player.x;
		gamePiece.y = player.y;
	});

	var gamePieceNames = Object.keys(gamePieces);
	gamePieceNames.forEach(function(gamePieceName) {
		if(!players[gamePieceName]) {
			delete gamePieces[gamePieceName];
		}
	})

}


function createNewPlayer(playerName) {

	var gamePiece = { loaded: false, x: 0, y:0 };
	gamePiece.picture = new Image();
	gamePiece.picture.onload = function() {
		gamePiece.loaded = true;
	}
	gamePiece.picture.src = '/picture/' + playerName;
	gamePieces[playerName] = gamePiece;

}

function drawPlayers() {

	var playerNames = Object.keys(gamePieces);
	var pieceWidth = Math.min($canvas.width, $canvas.height) / 25;
	playerNames.forEach(function(playerName) {
		var gamePiece = gamePieces[playerName];
		if(!gamePiece.loaded) return;
		context.drawImage(gamePiece.picture ,gamePiece.x, gamePiece.y, pieceWidth, pieceWidth);
	});

}

function animate() {

	context.clearRect(0, 0, $canvas.width, $canvas.height);
	drawPlayers();
	window.requestAnimationFrame(animate);

}

function updatePlayerPosition(e) {

	var gamePiece = gamePieces[user];
	switch(e.key) {
		case 'ArrowLeft':
			gamePiece.x--;
			break;
		case 'ArrowRight':
			gamePiece.x++;
			break;
		case 'ArrowDown':
			gamePiece.y++;
			break;
		case 'ArrowUp':
			gamePiece.y--;
			break;
		default:
			return;
	}
	socket.emit('playerUpdate', {x: gamePiece.x, y: gamePiece.y});

}

document.body.addEventListener('keydown', updatePlayerPosition);
window.requestAnimationFrame(animate);
createNewPlayer(user);
