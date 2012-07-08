require 'sinatra'
require 'net/http'
require 'uri'

get '/' do
  erb :index
end

post '/' do
  username = h params[:username]
  
  redirect "/#{username}"
end

get '/:username' do
  @username = h params[:username]
  @url = "http://#{@username}.tumblr.com/"
  
  uri = URI.parse(@url)
  http = Net::HTTP.new(uri.host, uri.port)
  request = Net::HTTP::Get.new(uri.request_uri)
  response = http.request(request)
  @url = response['location'] if response['location']
  
  erb :stats
end

helpers do
  # escape html
  include Rack::Utils
  alias_method :h, :escape_html
end