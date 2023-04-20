require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');

const ClientError = require('../src/exceptions/ClientError');
const NotFoundError = require('../src/exceptions/NotFoundError');
const AuthorizationError = require('../src/exceptions/AuthorizationError');
const AuthenticationError = require('../src/exceptions/AuthenticationError');

const albums = require('./api/albums');
const AlbumsService = require('./services/postgres/AlbumsService');
const AlbumsValidator = require('./validator/albums');

const songs = require('./api/songs');
const SongsService = require('./services/postgres/SongsService');
const SongsValidator = require('./validator/songs');

const users = require('./api/users');
const UsersService = require('./services/postgres/UsersService');
const UsersValidator = require('./validator/users');

const authentications = require('./api/authentications');
const AuthenticationsService = require('./services/postgres/AuthenticationsService');
const TokenManager = require('./tokenize/TokenManager');
const AuthenticationsValidator = require('./validator/authentications');

const playlists = require('./api/playlists');
const PlaylistsService = require('./services/postgres/PlaylistsService');
const PlaylistsValidator = require('./validator/playlists');

const init = async () => {
  const albumsService = new AlbumsService();
  const songsService = new SongsService(albumsService);
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const playlistsService = new PlaylistsService(songsService);

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  await server.register([
    {
      plugin: Jwt,
    },
  ]);

  server.auth.strategy('notesapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: {
        AlbumsService: albumsService,
        AlbumsValidator: AlbumsValidator,
      },
    },
    {
      plugin: songs,
      options: {
        SongsService: songsService,
        SongsValidator: SongsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        validator: PlaylistsValidator,
      },
    },
  ]);

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;
    if (response instanceof Error) {
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: 'Gagal karena request tidak sesuai',
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      if (response instanceof NotFoundError) {
        const newResponse = h.response({
          status: 'fail',
          message: 'Data tidak ditemukan',
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      if (response instanceof AuthenticationError) {
        const newResponse = h.response({
          status: 'fail',
          message: 'Anda dibatasi untuk mengakses resource ini',
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: 'Gagal karena refresh token tidak valid',
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      if (response instanceof AuthorizationError) {
        const newResponse = h.response({
          status: 'fail',
          message: 'Anda tidak berhak mengakses resource ini',
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      if (!response.isServer) {
        return h.continue;
      }
      
      const newResponse = h.response({
        status: 'error',
        message: 'terjadi kegagalan pada server kami',
      });

      console.log(response);
	    console.log(response.message);

      newResponse.code(500);
      return newResponse;
    }
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();