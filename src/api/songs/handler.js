const autoBind = require('auto-bind');

class SongsHandler {
  constructor(SongsService, SongsValidator) {
    this._songsService = SongsService;
    this._songsValidator = SongsValidator;

    autoBind(this);
  }

  async postSongHandler(request, h) {
    this._songsValidator.validateSongPayload(request.payload);

    const { title = 'Untitled', year, performer, genre, duration } = request.payload;
    const songId = await this._songsService.addSong({ title, year, performer, genre, duration });

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan',
      data: {
        songId,
      },
    });

    response.code(201);
    return response;
  }

  async getSongsHandler() {
    const songs = await this._songsService.getSongs();

    return {
      status: 'success',
      data: {
        songs,
      },
    };
  }

  async getSongByIdHandler(request) {
    const { id } = request.params;
    const song = await this._songsService.getSongById(id);
    
    return {
      status: 'success',
      data: {
        song,
      },
    };
  }

  async putSongByIdHandler(request) {
    this._songsValidator.validateSongPayload(request.payload);
    const { id } = request.params;

    await this._songsService.editSongById(id, request.payload);
    
    return {
      status: 'success',
      message: 'Lagu berhasil diperbarui',
    };
  }

  async deleteSongByIdHandler(request) {
    const { id } = request.params;
    await this._songsService.deleteSongById(id);
    
    return {
      status: 'success',
      message: 'Lagu berhasil dihapus',
    };
  }
}

module.exports = SongsHandler;